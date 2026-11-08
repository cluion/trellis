import { describe, it, expect, vi } from 'vitest';
import { Trellis } from '../src/trellis';
import type { TransformFn, TrellisPlugin } from '../src/types';

const data = [
    { name: 'Alice', alternate: 'Z' },
    { name: 'Bob', alternate: 'A' },
    { name: 'Carol', alternate: 'Y' },
];
const columns = [{ id: 'name', accessor: 'name' as const, header: 'Name' }];

function fixture() {
    const shaping = vi.fn<TransformFn<(typeof data)[number]>>((rows, state) => {
        if (state.dataMode === 'server') {
            return rows;
        }

        const accessor = state.columns[0].accessor as 'name' | 'alternate';
        const filtered = rows.filter((row) =>
            row.original[accessor].includes(state.filtering.query),
        );

        return state.sorting.sortBy[0]?.direction === 'desc'
            ? filtered.reverse()
            : filtered;
    });
    const viewport = vi.fn<TransformFn<(typeof data)[number]>>((rows) => rows);
    const table = new Trellis({
        data: data.map((row) => ({ ...row })),
        columns,
        plugins: [
            {
                name: 'cache',
                install(api) {
                    api.registerTransform('shape', 10, shaping, {
                        stateKeys: [
                            'filtering',
                            'sorting',
                            'columns',
                            'dataMode',
                        ],
                    });
                    api.registerTransform('viewport', 35, viewport);
                },
            },
        ],
    });

    return { table, shaping, viewport };
}

describe('pipeline cache', () => {
    it('isolates mutable transform input arrays from cached source rows', () => {
        let captured: unknown[] = [];
        const table = new Trellis({
            data,
            columns,
            plugins: [
                {
                    name: 'pure',
                    install(api) {
                        api.registerTransform(
                            'pure',
                            10,
                            (rows) => {
                                captured = rows;

                                return rows;
                            },
                            { stateKeys: [] },
                        );
                    },
                },
            ],
        });
        expect(Object.isFrozen(captured)).toBe(false);
        captured.reverse();
        table.api.recomputeView();
        expect(
            table.api.getState().data.map((row) => row.original.name),
        ).toEqual(['Alice', 'Bob', 'Carol']);
    });

    it('protects class-based transform row metadata without freezing its payload', () => {
        const original = { name: 'Custom', alternate: 'C' };
        class Row {
            id = 'custom';
            index = 0;
            original = original;
        }
        const custom = new Row();
        const table = new Trellis({
            data: [],
            columns,
            plugins: [
                {
                    name: 'custom',
                    install(api) {
                        api.registerTransform('custom', 10, () => [custom]);
                    },
                },
            ],
        });
        custom.id = 'outside';
        expect(table.api.getState().data[0].id).toBe('custom');
        expect(() => {
            table.api.getState().data[0].index = 1;
        }).toThrow(TypeError);
        expect(table.api.getState().data[0].original).toBe(original);
        expect(Object.isFrozen(original)).toBe(false);
    });

    it('reuses declared shaping work while rerunning viewport transforms', () => {
        const { table, shaping, viewport } = fixture();
        table.api.recomputeView();
        table.api.recomputeView();
        expect(shaping).toHaveBeenCalledTimes(1);
        expect(viewport).toHaveBeenCalledTimes(3);
        expect(
            table.api.getState().data.map((row) => row.original.name),
        ).toEqual(['Alice', 'Bob', 'Carol']);
    });

    it('invalidates filtering, sorting, column and remote-mode dependencies', () => {
        const { table, shaping } = fixture();
        table.api.setState((state) => ({
            filtering: { ...state.filtering, query: 'A' },
        }));
        table.api.recomputeView();
        expect(
            table.api.getState().data.map((row) => row.original.name),
        ).toEqual(['Alice']);
        table.api.setState(() => ({
            columns: [{ ...columns[0], accessor: 'alternate' }],
        }));
        table.api.recomputeView();
        expect(
            table.api.getState().data.map((row) => row.original.name),
        ).toEqual(['Bob']);
        table.api.setState((state) => ({
            filtering: { ...state.filtering, query: '' },
            sorting: { sortBy: [{ columnId: 'name', direction: 'desc' }] },
        }));
        table.api.recomputeView();
        expect(
            table.api.getState().data.map((row) => row.original.name),
        ).toEqual(['Carol', 'Bob', 'Alice']);
        table.api.setState(() => ({ dataMode: 'server' }));
        table.api.recomputeView();
        expect(
            table.api.getState().data.map((row) => row.original.name),
        ).toEqual(['Alice', 'Bob', 'Carol']);
        expect(shaping).toHaveBeenCalledTimes(5);
    });

    it('reuses shaping across unrelated selection updates', () => {
        const { table, shaping } = fixture();
        table.api.setState(() => ({ selection: new Set(['1']) }));
        table.api.recomputeView();
        expect(shaping).toHaveBeenCalledTimes(1);
        expect([...table.api.getState().selection]).toEqual(['1']);
    });

    it('keeps recompute as a forced refresh for externally owned row payloads', () => {
        const { table, shaping } = fixture();
        const row = table.api.getState().data[0].original;
        row.name = 'Updated';
        table.api.recompute({
            filtering: { query: 'Updated', columnFilters: {} },
        });
        expect(table.api.getState().data[0].original).toBe(row);
        table.api.recompute();
        expect(shaping).toHaveBeenCalledTimes(3);
        expect(table.api.getState().data[0].original.name).toBe('Updated');
    });

    it('refreshes after source replacement, add, update and removal', () => {
        const { table, shaping } = fixture();
        table.api.updateSourceData([{ name: 'Dan', alternate: 'D' }]);
        table.api.recomputeView();
        expect(
            table.api.getState().data.map((row) => row.original.name),
        ).toEqual(['Dan']);
        table.api.addRow({ name: 'Eve', alternate: 'E' });
        const id = table.api.getState().data[0].id;
        table.api.updateRow(id, { name: 'Updated' });
        table.api.removeRow(id);
        table.api.recomputeView();
        expect(
            table.api.getState().data.map((row) => row.original.name),
        ).toEqual(['Eve']);
        expect(shaping).toHaveBeenCalledTimes(5);
    });

    it('runs legacy custom transforms and invalidates following caches', () => {
        let offset = 0;
        const upstream = vi.fn<TransformFn<(typeof data)[number]>>(
            (rows) => rows,
        );
        const custom = vi.fn<TransformFn<(typeof data)[number]>>((rows) => {
            rows.splice(0, offset);

            return rows;
        });
        const downstream = vi.fn<TransformFn<(typeof data)[number]>>(
            (rows) => rows,
        );
        const plugin: TrellisPlugin<(typeof data)[number]> = {
            name: 'legacy',
            install(api) {
                api.registerTransform('upstream', 10, upstream, {
                    stateKeys: [],
                });
                api.registerTransform('custom', 20, custom);
                api.registerTransform('downstream', 25, downstream, {
                    stateKeys: [],
                });
            },
        };
        const table = new Trellis({ data, columns, plugins: [plugin] });
        offset = 1;
        table.api.recomputeView();
        expect(
            table.api.getState().data.map((row) => row.original.name),
        ).toEqual(['Bob', 'Carol']);
        expect(upstream).toHaveBeenCalledTimes(1);
        expect(custom).toHaveBeenCalledTimes(2);
        expect(downstream).toHaveBeenCalledTimes(2);
        expect(table.api.getFilteredData()).toHaveLength(2);
    });

    it('does not retain mutable output arrays captured by a transform', () => {
        let captured: unknown[] = [];
        const table = new Trellis({
            data,
            columns,
            plugins: [
                {
                    name: 'capture',
                    install(api) {
                        api.registerTransform(
                            'capture',
                            10,
                            (rows) => {
                                const output = [...rows];
                                captured = output;

                                return output;
                            },
                            { stateKeys: [] },
                        );
                    },
                },
            ],
        });
        captured.reverse();
        table.api.recomputeView();
        expect(
            table.api.getState().data.map((row) => row.original.name),
        ).toEqual(['Alice', 'Bob', 'Carol']);
    });
});
