import { describe, it, expect, vi, afterEach } from 'vitest';
import { Trellis } from '../packages/core/src/trellis';
import type { TrellisPlugin } from '../packages/core/src/types';
import { createFilterPlugin } from '../packages/plugin-filter/src/filter-plugin';
import { createPaginationPlugin } from '../packages/plugin-pagination/src/pagination-plugin';
import { createSortPlugin } from '../packages/plugin-sort/src/sort-plugin';
import { createVirtualScrollPlugin } from '../packages/plugin-virtual-scroll/src/virtual-scroll-plugin';

afterEach(() => vi.unstubAllGlobals());

describe('viewport cache with actual plugins', () => {
    it('skips repeated shaping after queries, pages and row mutations', () => {
        vi.stubGlobal(
            'requestAnimationFrame',
            (callback: FrameRequestCallback) => {
                callback(0);

                return 0;
            },
        );
        vi.stubGlobal('cancelAnimationFrame', () => {});
        const calls = { filter: 0, sort: 0 };
        const track = (
            plugin: TrellisPlugin,
            name: keyof typeof calls,
        ): TrellisPlugin => ({
            ...plugin,
            install(api) {
                plugin.install({
                    ...api,
                    registerTransform(key, priority, fn, options) {
                        api.registerTransform(
                            key,
                            priority,
                            (rows, state) => {
                                calls[name]++;

                                return fn(rows, state);
                            },
                            options,
                        );
                    },
                });
            },
        });
        const vs = createVirtualScrollPlugin({ rowHeight: 40, overscan: 0 });
        const table = new Trellis({
            data: Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                name: i % 2 ? 'beta' : 'alpha',
                score: i,
            })),
            columns: [
                { id: 'name', accessor: 'name', header: 'Name' },
                { id: 'score', accessor: 'score', header: 'Score' },
            ],
            rowId: 'id',
            pageSize: 100,
            plugins: [
                track(createFilterPlugin(), 'filter'),
                track(createSortPlugin(), 'sort'),
                createPaginationPlugin(),
                vs,
            ],
        });
        let listener: (() => void) | undefined;
        const viewport = {
            scrollTop: 0,
            clientHeight: 200,
            addEventListener(_name: string, callback: () => void) {
                listener = callback;
            },
            removeEventListener() {
                listener = undefined;
            },
        };
        vs.attachScrollContainer(viewport as unknown as HTMLElement);
        const scroll = () => {
            viewport.scrollTop = 40;
            listener!();
        };
        const expectCachedScroll = () => {
            const before = { ...calls };
            scroll();
            scroll();
            expect(calls).toEqual(before);
            expect(table.api.getState().data.length).toBeGreaterThan(0);
        };
        expectCachedScroll();
        table.api.emit('filter:change', { query: 'alpha' });
        expect(table.api.getState().pagination.totalItems).toBe(500);
        expectCachedScroll();
        table.api.emit('sort:change', { columnId: 'score', direction: 'desc' });
        expect(table.api.getState().data[0].original.id).toBe(998);
        expectCachedScroll();
        table.api.emit('pagination:next');
        expect(table.api.getState().data[0].original.id).toBe(798);
        expectCachedScroll();
        table.api.updateRow('798', { name: 'beta' });
        expect(table.api.getState().pagination.totalItems).toBe(499);
        expectCachedScroll();
        table.api.removeRow('796');
        expect(table.api.getState().pagination.totalItems).toBe(498);
        expectCachedScroll();
        table.api.addRow({ id: 1001, name: 'alpha', score: 1001 });
        expect(table.api.getState().pagination.totalItems).toBe(499);
        expectCachedScroll();
        table.destroy();
    });
});
