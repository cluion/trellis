import { Trellis } from '@trellisjs/core';
import type { ColumnDef } from '@trellisjs/core';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createVirtualScrollPlugin } from '../src/virtual-scroll-plugin';

interface Item {
    name: string;
    value: number;
}

const columns: ColumnDef<Item>[] = [
    { id: 'name', accessor: 'name', header: 'Name' },
    { id: 'value', accessor: 'value', header: 'Value' },
];

function generateData(count: number): Item[] {
    return Array.from({ length: count }, (_, i) => ({
        name: `Item ${i + 1}`,
        value: i + 1,
    }));
}

function scrollContainer() {
    let listener: (() => void) | undefined;

    return {
        scrollTop: 0,
        clientHeight: 400,
        addEventListener(_event: string, callback: () => void) {
            listener = callback;
        },
        removeEventListener() {
            listener = undefined;
        },
        scroll(top: number) {
            this.scrollTop = top;
            listener?.();
            const pending = [...rafCallbacks.values()];
            rafCallbacks.clear();
            pending.forEach((callback) => callback(0));
        },
    };
}

// Mock rAF
const rafCallbacks: Map<number, FrameRequestCallback> = new Map();
let rafCounter = 0;

beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        const id = ++rafCounter;
        rafCallbacks.set(id, cb);

        return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
        rafCallbacks.delete(id);
    });
});

afterEach(() => {
    rafCallbacks.clear();
    rafCounter = 0;
});

describe('pagination + virtualScroll 整合', () => {
    it.each([false, true])(
        '實際捲動只使用當頁列數，插件反向註冊=%s',
        (reverse) => {
            const vs = createVirtualScrollPlugin({
                rowHeight: 40,
                overscan: 0,
            });
            const plugins = [createPaginationPlugin(), vs];
            const table = new Trellis({
                data: generateData(1000),
                columns,
                pageSize: 100,
                plugins: reverse ? plugins.reverse() : plugins,
            });
            const viewport = scrollContainer();
            vs.attachScrollContainer(viewport as unknown as HTMLElement);
            expect(table.api.getState().virtualScroll?.totalHeight).toBe(4000);
            viewport.scroll(4000);
            expect(viewport.scrollTop).toBe(3600);
            expect(
                table.api.getState().data.map((row) => row.original.value),
            ).toEqual([91, 92, 93, 94, 95, 96, 97, 98, 99, 100]);
            expect(table.api.getState().virtualScroll?.endIndex).toBe(100);
            expect(table.api.getState().pagination.totalItems).toBe(1000);
            table.api.emit('pagination:next');
            expect(viewport.scrollTop).toBe(0);
            expect(table.api.getState().data[0].original.value).toBe(101);
            table.destroy();
        },
    );

    it('最後一頁、資料縮減及零筆會同步校正視窗', () => {
        const vs = createVirtualScrollPlugin({ rowHeight: 40, overscan: 0 });
        const table = new Trellis({
            data: generateData(225),
            columns,
            pageSize: 100,
            plugins: [createPaginationPlugin(), vs],
        });
        const viewport = scrollContainer();
        vs.attachScrollContainer(viewport as unknown as HTMLElement);
        table.api.emit('pagination:goto', { page: 3 });
        expect(table.api.getState().virtualScroll?.totalHeight).toBe(1000);
        viewport.scroll(10000);
        expect(table.api.getState().data[0].original.value).toBe(216);
        table.api.updateSourceData(generateData(3));
        expect(viewport.scrollTop).toBe(0);
        expect(table.api.getState().virtualScroll).toMatchObject({
            startIndex: 0,
            endIndex: 3,
            totalHeight: 120,
        });
        expect(table.api.getState().data).toHaveLength(3);
        table.api.updateSourceData([]);
        expect(table.api.getState().virtualScroll).toMatchObject({
            startIndex: 0,
            endIndex: 0,
            totalHeight: 0,
        });
        table.destroy();
    });

    it('遠端 filtered 保留於分頁，捲動高度只計算載入頁', () => {
        const vs = createVirtualScrollPlugin({ rowHeight: 40, overscan: 0 });
        const table = new Trellis({
            data: generateData(25),
            columns,
            pageSize: 100,
            plugins: [createPaginationPlugin(), vs],
        });
        table.api.recompute({
            dataMode: 'server',
            pagination: { page: 4, pageSize: 100, totalItems: 1000 },
        });
        const viewport = scrollContainer();
        vs.attachScrollContainer(viewport as unknown as HTMLElement);
        viewport.scroll(10000);
        expect(table.api.getState().virtualScroll).toMatchObject({
            startIndex: 15,
            endIndex: 25,
            totalHeight: 1000,
        });
        expect(table.api.getState().pagination).toEqual({
            page: 4,
            pageSize: 100,
            totalItems: 1000,
        });
        expect(table.api.getState().data).toHaveLength(10);
        table.destroy();
    });

    it('pagination 切出分頁資料後 virtualScroll 再切出可視範圍', () => {
        const vsPlugin = createVirtualScrollPlugin({
            rowHeight: 40,
            overscan: 0,
        });
        const trellis = new Trellis<Item>({
            data: generateData(1000),
            columns,
            pageSize: 100,
            plugins: [createPaginationPlugin(), vsPlugin],
        });

        // 驗證 pagination 先切 100 筆
        // 然後 virtualScroll 再切
        trellis.api.recompute({
            virtualScroll: {
                startIndex: 5,
                endIndex: 15,
                totalHeight: 40000,
                rowHeight: 40,
            },
        } as any);

        const state = trellis.api.getState();

        // virtualScroll transform 從 100 筆中切出 5~15
        expect(state.data).toHaveLength(10);
        expect(state.data[0].original.name).toBe('Item 6'); // 分頁第 1 頁的第 6 筆

        // pagination 狀態正確
        expect(state.pagination.page).toBe(1);
        expect(state.pagination.totalItems).toBe(1000);
    });

    it('pageSize 大於可視行數時只有可視行被渲染', () => {
        const vsPlugin = createVirtualScrollPlugin({
            rowHeight: 40,
            overscan: 0,
        });
        const trellis = new Trellis<Item>({
            data: generateData(1000),
            columns,
            pageSize: 100,
            plugins: [createPaginationPlugin(), vsPlugin],
        });

        // 設定可視範圍只有 5 行
        trellis.api.recompute({
            virtualScroll: {
                startIndex: 0,
                endIndex: 5,
                totalHeight: 40000,
                rowHeight: 40,
            },
        } as any);

        const state = trellis.api.getState();

        // 只有 5 筆在 state.data 中
        expect(state.data).toHaveLength(5);
        // 但 pagination.totalItems 仍為 1000
        expect(state.pagination.totalItems).toBe(1000);
    });

    it('切換分頁後 virtualScroll 範圍重新計算', () => {
        const vsPlugin = createVirtualScrollPlugin({
            rowHeight: 40,
            overscan: 0,
        });
        const trellis = new Trellis<Item>({
            data: generateData(1000),
            columns,
            pageSize: 100,
            plugins: [createPaginationPlugin(), vsPlugin],
        });

        // 第 1 頁，virtualScroll 切 0~10
        trellis.api.recompute({
            virtualScroll: {
                startIndex: 0,
                endIndex: 10,
                totalHeight: 40000,
                rowHeight: 40,
            },
        } as any);

        let state = trellis.api.getState();
        expect(state.data[0].original.name).toBe('Item 1');

        // 切到第 2 頁，virtualScroll 仍然從 0~10
        trellis.api.emit('pagination:next', {});

        state = trellis.api.getState();
        // 第 2 頁的資料從 Item 101 開始
        expect(state.data[0].original.name).toBe('Item 101');
        expect(state.pagination.page).toBe(2);
    });
});
