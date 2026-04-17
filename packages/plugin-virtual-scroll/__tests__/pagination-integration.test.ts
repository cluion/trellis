import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { createVirtualScrollPlugin } from '../src/virtual-scroll-plugin';
import type { ColumnDef } from '@trellisjs/core';

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

// Mock rAF
let rafCallbacks: Map<number, FrameRequestCallback> = new Map();
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

function flushRaf() {
  const cbs = [...rafCallbacks.values()];
  rafCallbacks.clear();
  cbs.forEach((cb) => cb(performance.now()));
}

describe('pagination + virtualScroll 整合', () => {
  it('pagination 切出分頁資料後 virtualScroll 再切出可視範圍', () => {
    const vsPlugin = createVirtualScrollPlugin({ rowHeight: 40, overscan: 0 });
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
    const vsPlugin = createVirtualScrollPlugin({ rowHeight: 40, overscan: 0 });
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
    const vsPlugin = createVirtualScrollPlugin({ rowHeight: 40, overscan: 0 });
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
