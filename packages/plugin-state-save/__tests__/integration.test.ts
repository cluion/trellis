import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createRowExpansionPlugin } from '@trellisjs/plugin-row-expansion';
import { createStateSavePlugin } from '../src/state-save-plugin';
import type { StorageAdapter } from '../src/storage';
import type { ColumnDef } from '@trellisjs/core';

interface Row {
  id: number;
  name: string;
  city: string;
  age: number;
}

const columns: ColumnDef<Row>[] = [
  { id: 'name', accessor: 'name', header: 'Name', sortable: true },
  { id: 'city', accessor: 'city', header: 'City', filterable: true },
  { id: 'age', accessor: 'age', header: 'Age' },
];

const data: Row[] = [
  { id: 1, name: 'Alice', city: 'Taipei', age: 30 },
  { id: 2, name: 'Bob', city: 'Tokyo', age: 25 },
  { id: 3, name: 'Charlie', city: 'Taipei', age: 35 },
  { id: 4, name: 'Diana', city: 'Seoul', age: 28 },
  { id: 5, name: 'Eve', city: 'Tokyo', age: 22 },
];

function createMemoryStore() {
  const store = new Map<string, string>();
  const adapter: StorageAdapter = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  return { store, adapter };
}

describe('State Save 跨插件整合', () => {
  let store: Map<string, string>;
  let adapter: StorageAdapter;

  beforeEach(() => {
    const mem = createMemoryStore();
    store = mem.store;
    adapter = mem.adapter;
  });

  it('排序→保存→重建→恢復排序狀態', () => {
    vi.useFakeTimers();
    const table1 = new Trellis<Row>({
      data,
      columns,
      plugins: [createSortPlugin(), createStateSavePlugin({ storage: adapter, debounceMs: 100 })],
      rowId: 'id',
    });

    table1.api.emit('sort:change', { columnId: 'name', direction: 'asc' });
    vi.advanceTimersByTime(150);
    vi.useRealTimers();

    const saved = store.get('trellis-state');
    expect(saved).toBeDefined();
    const parsed = JSON.parse(saved!);
    expect(parsed.sorting.sortBy[0].columnId).toBe('name');

    const table2 = new Trellis<Row>({
      data,
      columns,
      plugins: [createSortPlugin(), createStateSavePlugin({ storage: adapter })],
      rowId: 'id',
    });

    const state = table2.api.getState();
    expect(state.sorting.sortBy.length).toBe(1);
    expect(state.sorting.sortBy[0].columnId).toBe('name');
    expect(state.sorting.sortBy[0].direction).toBe('asc');
  });

  it('篩選+分頁→保存→恢復兩者正確', () => {
    vi.useFakeTimers();
    const table1 = new Trellis<Row>({
      data,
      columns,
      plugins: [
        createFilterPlugin(),
        createPaginationPlugin(),
        createStateSavePlugin({ storage: adapter, debounceMs: 100 }),
      ],
      rowId: 'id',
      pageSize: 2,
    });

    // 先翻頁到第 2 頁（5 筆，pageSize 2，共 3 頁，page 2 有效）
    table1.api.emit('pagination:goto', { page: 2 });
    // 全域搜尋 'a'：Alice、Charlie、Diana = 3 筆，pageSize 2，共 2 頁，page 2 仍有效
    table1.api.emit('filter:change', { query: 'a' });
    vi.advanceTimersByTime(150);
    vi.useRealTimers();

    const saved = JSON.parse(store.get('trellis-state')!);
    expect(saved.filtering.query).toBe('a');
    expect(saved.pagination.page).toBe(2);

    const table2 = new Trellis<Row>({
      data,
      columns,
      plugins: [
        createFilterPlugin(),
        createPaginationPlugin(),
        createStateSavePlugin({ storage: adapter }),
      ],
      rowId: 'id',
      pageSize: 2,
    });

    const state = table2.api.getState();
    expect(state.filtering.query).toBe('a');
    expect(state.pagination.page).toBe(2);
  });

  it('expandedRows Set 正確序列化和反序列化', () => {
    vi.useFakeTimers();
    const table1 = new Trellis<Row>({
      data,
      columns,
      plugins: [
        createRowExpansionPlugin({ mode: 'multi' }),
        createStateSavePlugin({ storage: adapter, debounceMs: 100 }),
      ],
      rowId: 'id',
    });

    table1.api.emit('expansion:expand', { rowId: '1' });
    table1.api.emit('expansion:expand', { rowId: '3' });
    vi.advanceTimersByTime(150);
    vi.useRealTimers();

    const saved = JSON.parse(store.get('trellis-state')!);
    expect(Array.isArray(saved.expandedRows)).toBe(true);
    expect(saved.expandedRows).toContain('1');
    expect(saved.expandedRows).toContain('3');

    const table2 = new Trellis<Row>({
      data,
      columns,
      plugins: [
        createRowExpansionPlugin({ mode: 'multi' }),
        createStateSavePlugin({ storage: adapter }),
      ],
      rowId: 'id',
    });

    const state = table2.api.getState();
    expect(state.expandedRows).toBeInstanceOf(Set);
    expect(state.expandedRows.has('1')).toBe(true);
    expect(state.expandedRows.has('3')).toBe(true);
  });
});
