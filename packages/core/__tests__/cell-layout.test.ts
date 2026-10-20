import { describe, it, expect } from 'vitest';
import {
    getBodyCellLayout,
    getHeaderCellLayout,
} from '../src/layout/cell-layout';
import { Trellis } from '../src/trellis';
import type { ColumnDef, TableState } from '../src/types';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
    { id: 'id', accessor: 'id', header: 'ID', width: 60 },
    { id: 'name', accessor: 'name', header: 'Name', width: 100 },
    { id: 'email', accessor: 'email', header: 'Email', width: 200 },
    { id: 'age', accessor: 'age', header: 'Age', width: 80 },
];

function stateWith(partial: Partial<TableState<Row>> = {}) {
    const trellis = new Trellis<Row>({ data: [], columns });

    trellis.api.setState(() => partial);

    return trellis.api.getState();
}

const resizing = {
    columnWidths: {},
    resizingColumn: null,
    minWidth: 50,
    defaultWidth: 150,
};

describe('getHeaderCellLayout', () => {
    it('數字長度轉成 px 字串，字串原樣保留', () => {
        const layout = getHeaderCellLayout(
            {
                id: 'name',
                accessor: 'name',
                header: 'Name',
                width: 100,
                minWidth: '20%',
                maxWidth: 300,
                align: 'right',
            },
            stateWith(),
        );

        expect(layout.style).toEqual({
            width: '100px',
            minWidth: '20%',
            maxWidth: '300px',
            textAlign: 'right',
        });
        expect(layout.className).toBeUndefined();
        expect(layout.resizable).toBe(false);
    });

    it('沒有任何樣式時 style 為 undefined', () => {
        const layout = getHeaderCellLayout(
            { id: 'x', accessor: 'x', header: 'X' },
            stateWith(),
        );

        expect(layout.style).toBeUndefined();
    });

    it('固定表頭：sticky + top 0', () => {
        const layout = getHeaderCellLayout(
            { id: 'x', accessor: 'x', header: 'X' },
            stateWith(),
            true,
        );

        expect(layout.style).toEqual({ position: 'sticky', top: 0 });
    });

    it('左側釘選：left 位移、zIndex 2，最後一欄加陰影 class', () => {
        const state = stateWith({
            columnPinning: { left: ['id', 'name'], right: [] },
        });
        const first = getHeaderCellLayout(columns[0], state);
        const last = getHeaderCellLayout(columns[1], state);

        expect(first.style).toMatchObject({
            position: 'sticky',
            left: '0px',
            zIndex: 2,
        });
        expect(first.className).toBeUndefined();
        expect(last.style).toMatchObject({ left: '60px' });
        expect(last.className).toBe('trellis-pin-shadow--left');
    });

    it('右側釘選：right 位移，第一欄加陰影 class', () => {
        const state = stateWith({
            columnPinning: { left: [], right: ['age'] },
        });
        const layout = getHeaderCellLayout(columns[3], state);

        expect(layout.style).toMatchObject({
            position: 'sticky',
            right: '0px',
        });
        expect(layout.className).toBe('trellis-pin-shadow--right');
    });

    it('釘選欄加上固定表頭時 zIndex 為 3', () => {
        const state = stateWith({
            columnPinning: { left: ['id'], right: [] },
        });

        expect(
            getHeaderCellLayout(columns[0], state, true).style,
        ).toMatchObject({ position: 'sticky', top: 0, left: '0px', zIndex: 3 });
    });

    it('調整欄寬：顯示把手、position relative，沒調整過時用 column.width', () => {
        const layout = getHeaderCellLayout(
            columns[1],
            stateWith({ columnResizing: resizing }),
        );

        expect(layout.resizable).toBe(true);
        expect(layout.style).toMatchObject({
            position: 'relative',
            width: '100px',
        });
    });

    it('調整欄寬：有調整過的寬度優先，沒有 column.width 時用 defaultWidth', () => {
        const state = stateWith({
            columnResizing: { ...resizing, columnWidths: { name: 240 } },
        });

        expect(getHeaderCellLayout(columns[1], state).style).toMatchObject({
            width: '240px',
        });
        expect(
            getHeaderCellLayout({ id: 'x', accessor: 'x', header: 'X' }, state)
                .style,
        ).toMatchObject({ width: '150px' });
    });

    it('column.resizable 為 false 時不顯示把手', () => {
        const layout = getHeaderCellLayout(
            { ...columns[1], resizable: false },
            stateWith({ columnResizing: resizing }),
        );

        expect(layout.resizable).toBe(false);
        expect(layout.style).toEqual({ width: '100px' });
    });

    it('同時啟用調整欄寬時，釘選欄與固定表頭仍維持 sticky', () => {
        const state = stateWith({
            columnPinning: { left: ['id'], right: [] },
            columnResizing: resizing,
        });

        expect(getHeaderCellLayout(columns[0], state).style).toMatchObject({
            position: 'sticky',
            left: '0px',
        });
        expect(
            getHeaderCellLayout(columns[2], state, true).style,
        ).toMatchObject({ position: 'sticky', top: 0 });
    });
});

describe('釘選欄調整寬度後的位移', () => {
    it('th 與 td 都跟著前面釘選欄的新寬度移動', () => {
        const state = stateWith({
            columnPinning: { left: ['id', 'name'], right: [] },
            columnResizing: { ...resizing, columnWidths: { id: 99 } },
        });

        expect(getHeaderCellLayout(columns[1], state).style).toMatchObject({
            left: '99px',
        });
        expect(getBodyCellLayout(columns[1], state).style).toMatchObject({
            left: '99px',
        });
    });
});

describe('getBodyCellLayout', () => {
    it('只套用對齊，不套用寬度', () => {
        const layout = getBodyCellLayout(
            { ...columns[1], align: 'center' },
            stateWith(),
        );

        expect(layout.style).toEqual({ textAlign: 'center' });
    });

    it('釘選欄：sticky、zIndex 1 與陰影 class', () => {
        const state = stateWith({
            columnPinning: { left: ['id', 'name'], right: [] },
        });
        const layout = getBodyCellLayout(columns[1], state);

        expect(layout.style).toEqual({
            position: 'sticky',
            left: '60px',
            zIndex: 1,
        });
        expect(layout.className).toBe('trellis-pin-shadow--left');
    });

    it('沒有任何樣式時 style 為 undefined', () => {
        expect(
            getBodyCellLayout(columns[0], stateWith()).style,
        ).toBeUndefined();
    });
});
