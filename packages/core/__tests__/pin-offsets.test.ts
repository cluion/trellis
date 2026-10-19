import { describe, it, expect } from 'vitest';
import type { ColumnDef, ColumnResizingState } from '../src/types';
import { calculatePinOffsets } from '../src/types/column-pinning';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
    { id: 'id', accessor: 'id', header: 'ID', width: 60 },
    { id: 'name', accessor: 'name', header: 'Name', width: 140 },
    { id: 'email', accessor: 'email', header: 'Email', width: 260 },
    { id: 'city', accessor: 'city', header: 'City', width: 120 },
    { id: 'role', accessor: 'role', header: 'Role', width: 160 },
];

const pinning = { left: ['id', 'name'], right: ['city', 'role'] };

function resizing(
    columnWidths: Record<string, number> = {},
): ColumnResizingState {
    return {
        columnWidths,
        resizingColumn: null,
        minWidth: 50,
        defaultWidth: 150,
    };
}

const offsetOf = (map: ReturnType<typeof calculatePinOffsets>, id: string) =>
    map.get(id)?.offset;

describe('calculatePinOffsets', () => {
    it('沒有調整欄寬時使用欄位定義的 width', () => {
        const offsets = calculatePinOffsets(columns, pinning, {});

        expect(offsetOf(offsets, 'name')).toBe(60);
        expect(offsetOf(offsets, 'city')).toBe(160);
    });

    it('左側：前面釘選欄調整後的寬度會推移後面的位移', () => {
        const offsets = calculatePinOffsets(
            columns,
            pinning,
            {},
            resizing({ id: 99 }),
        );

        expect(offsetOf(offsets, 'id')).toBe(0);
        expect(offsetOf(offsets, 'name')).toBe(99);
    });

    it('右側：後面釘選欄調整後的寬度會推移前面的位移', () => {
        const offsets = calculatePinOffsets(
            columns,
            pinning,
            {},
            resizing({ role: 200 }),
        );

        expect(offsetOf(offsets, 'role')).toBe(0);
        expect(offsetOf(offsets, 'city')).toBe(200);
    });

    it('啟用調整欄寬時，沒有 width 的欄位用 defaultWidth', () => {
        const offsets = calculatePinOffsets(
            [{ id: 'a', accessor: 'a', header: 'A' }, columns[1]],
            { left: ['a', 'name'], right: [] },
            {},
            resizing(),
        );

        expect(offsetOf(offsets, 'name')).toBe(150);
    });

    it('resizable: false 的欄位維持欄位定義的 width', () => {
        const offsets = calculatePinOffsets(
            [{ ...columns[0], resizable: false }, columns[1]],
            { left: ['id', 'name'], right: [] },
            {},
            resizing({ id: 99 }),
        );

        expect(offsetOf(offsets, 'name')).toBe(60);
    });
});
