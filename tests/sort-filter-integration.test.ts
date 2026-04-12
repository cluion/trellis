import { describe, it, expect } from 'vitest';
import { Trellis } from '../packages/core/src/trellis';
import { createSortPlugin } from '../packages/plugin-sort/src';
import { createFilterPlugin } from '../packages/plugin-filter/src';
import { createPaginationPlugin } from '../packages/plugin-pagination/src';

// 10 筆測試資料
const sampleData = [
  { name: 'Alice', age: 30, city: 'Taipei' },
  { name: 'Bob', age: 25, city: 'Tokyo' },
  { name: 'Charlie', age: 35, city: 'Taipei' },
  { name: 'Diana', age: 28, city: 'Seoul' },
  { name: 'Eve', age: 22, city: 'Taipei' },
  { name: 'Frank', age: 40, city: 'Tokyo' },
  { name: 'Grace', age: 33, city: 'Seoul' },
  { name: 'Henry', age: 27, city: 'Taipei' },
  { name: 'Ivy', age: 31, city: 'Tokyo' },
  { name: 'Jack', age: 29, city: 'Seoul' },
];

const columns = [
  { id: 'name', accessor: 'name' as const, header: 'Name' },
  { id: 'age', accessor: 'age' as const, header: 'Age' },
  { id: 'city', accessor: 'city' as const, header: 'City' },
];

describe('Sort + Filter + Pagination 整合', () => {
  it('篩選後排序 → 清除排序保留篩選', () => {
    const trellis = new Trellis({
      data: sampleData,
      columns,
      plugins: [createFilterPlugin(), createSortPlugin()],
    });

    // 篩選 city 含 "Taipei"
    trellis.api.emit('filter:change', { query: 'Taipei' });
    let state = trellis.api.getState();
    expect(state.data).toHaveLength(4);
    expect(state.data.every((row) => row.original.city === 'Taipei')).toBe(true);

    // 排序 age desc
    trellis.api.emit('sort:change', { columnId: 'age', direction: 'desc' });
    state = trellis.api.getState();
    expect(state.data).toHaveLength(4);
    expect(state.data[0].original.name).toBe('Charlie'); // age 35
    expect(state.data[1].original.name).toBe('Alice');   // age 30

    // 清除排序
    trellis.api.emit('sort:change', { columnId: 'age', direction: null });
    state = trellis.api.getState();
    expect(state.data).toHaveLength(4);
    // 篩選結果仍保留
    expect(state.data.every((row) => row.original.city === 'Taipei')).toBe(true);
    // 排序已清除，回到原始順序
    expect(state.data[0].original.name).toBe('Alice');
  });

  it('排序後篩選 → 清除篩選保留排序', () => {
    const trellis = new Trellis({
      data: sampleData,
      columns,
      plugins: [createSortPlugin(), createFilterPlugin()],
    });

    // 排序 age desc
    trellis.api.emit('sort:change', { columnId: 'age', direction: 'desc' });
    let state = trellis.api.getState();
    expect(state.data[0].original.name).toBe('Frank'); // age 40

    // 篩選含 "Taipei"
    trellis.api.emit('filter:change', { query: 'Taipei' });
    state = trellis.api.getState();
    expect(state.data).toHaveLength(4);
    expect(state.data[0].original.name).toBe('Charlie'); // Taipei 中 age 最大

    // 清除篩選
    trellis.api.emit('filter:change', { query: '' });
    state = trellis.api.getState();
    expect(state.data).toHaveLength(10);
    // 排序仍保留
    expect(state.data[0].original.name).toBe('Frank'); // age 40
  });

  it('三插件組合：filter + sort + pagination', () => {
    const trellis = new Trellis({
      data: sampleData,
      columns,
      pageSize: 3,
      plugins: [
        createFilterPlugin(),
        createSortPlugin(),
        createPaginationPlugin(),
      ],
    });

    // 初始狀態：10 筆、每頁 3 筆、第 1 頁
    let state = trellis.api.getState();
    expect(state.data).toHaveLength(3);
    expect(state.pagination.totalItems).toBe(10);

    // 篩選含 "i"（Alice, Charlie, Diana, Eve, Henry, Ivy — 包含 city 欄位匹配）
    trellis.api.emit('filter:change', { query: 'i' });
    state = trellis.api.getState();
    expect(state.data).toHaveLength(3); // 第一頁 3 筆
    expect(state.pagination.totalItems).toBe(6);

    // 排序 age asc
    trellis.api.emit('sort:change', { columnId: 'age', direction: 'asc' });
    state = trellis.api.getState();
    expect(state.data[0].original.name).toBe('Eve');  // age 22（含 i 的最小年齡）

    // 翻到第 2 頁
    trellis.api.emit('pagination:next', {});
    state = trellis.api.getState();
    expect(state.pagination.page).toBe(2);
    expect(state.data).toHaveLength(3); // 第 2 頁 3 筆（共 6 筆）
  });

  it('篩選變更時 totalItems 正確更新', () => {
    const trellis = new Trellis({
      data: sampleData,
      columns,
      pageSize: 5,
      plugins: [
        createFilterPlugin(),
        createPaginationPlugin(),
      ],
    });

    // 初始
    let state = trellis.api.getState();
    expect(state.pagination.totalItems).toBe(10);

    // 篩選 "Tokyo"（Bob, Frank, Ivy）
    trellis.api.emit('filter:change', { query: 'Tokyo' });
    state = trellis.api.getState();
    expect(state.pagination.totalItems).toBe(3);
    expect(state.data).toHaveLength(3); // 3 < 5，一頁就夠

    // 清除篩選
    trellis.api.emit('filter:change', { query: '' });
    state = trellis.api.getState();
    expect(state.pagination.totalItems).toBe(10);
    expect(state.data).toHaveLength(5); // 恢復第一頁 5 筆
  });

  it('清除所有 → 回復原始資料', () => {
    const trellis = new Trellis({
      data: sampleData,
      columns,
      pageSize: 3,
      plugins: [
        createFilterPlugin(),
        createSortPlugin(),
        createPaginationPlugin(),
      ],
    });

    // 篩選 + 排序 + 翻頁
    trellis.api.emit('filter:change', { query: 'e' });
    trellis.api.emit('sort:change', { columnId: 'age', direction: 'asc' });
    trellis.api.emit('pagination:next', {});

    let state = trellis.api.getState();
    expect(state.data.length).toBeGreaterThan(0);
    expect(state.pagination.page).toBe(2);

    // 清除排序
    trellis.api.emit('sort:change', { columnId: 'age', direction: null });
    // 清除篩選
    trellis.api.emit('filter:change', { query: '' });

    state = trellis.api.getState();
    expect(state.pagination.totalItems).toBe(10);
    // 仍在第 2 頁，第一筆是 Diana（原始順序中第 4 筆）
    expect(state.data[0].original.name).toBe('Diana');
  });
});
