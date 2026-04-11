import { describe, it, expect } from 'vitest';
import { createStaticDatasource } from '../src/static-datasource';

interface User { name: string; age: number; }

const data: User[] = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
  { name: 'Charlie', age: 35 },
  { name: 'Diana', age: 28 },
  { name: 'Eve', age: 22 },
];

describe('靜態資料源', () => {
  it('無排序無篩選時回傳全部資料', async () => {
    const ds = createStaticDatasource(data);
    const result = await ds.fetch({ page: 1, pageSize: 10 });

    expect(result.data).toHaveLength(5);
    expect(result.total).toBe(5);
    expect(result.filtered).toBe(5);
  });

  it('根據 pageSize 分頁', async () => {
    const ds = createStaticDatasource(data);
    const result = await ds.fetch({ page: 1, pageSize: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ name: 'Alice', age: 30 });
    expect(result.total).toBe(5);
  });

  it('取得第二頁資料', async () => {
    const ds = createStaticDatasource(data);
    const result = await ds.fetch({ page: 2, pageSize: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ name: 'Charlie', age: 35 });
  });

  it('最後一頁資料數量可能較少', async () => {
    const ds = createStaticDatasource(data);
    const result = await ds.fetch({ page: 3, pageSize: 2 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({ name: 'Eve', age: 22 });
  });

  it('根據排序條件排序', async () => {
    const ds = createStaticDatasource(data);
    const result = await ds.fetch({
      page: 1,
      pageSize: 10,
      sort: [{ columnId: 'age', direction: 'desc' }],
    });

    expect(result.data[0]).toEqual({ name: 'Charlie', age: 35 });
    expect(result.data[4]).toEqual({ name: 'Eve', age: 22 });
  });

  it('根據全域搜尋篩選', async () => {
    const ds = createStaticDatasource(data);
    const result = await ds.fetch({
      page: 1,
      pageSize: 10,
      filter: { global: 'li' },
    });

    expect(result.data).toHaveLength(2); // Alice, Charlie
    expect(result.filtered).toBe(2);
    expect(result.total).toBe(5);
  });

  it('同時排序與篩選', async () => {
    const ds = createStaticDatasource(data);
    const result = await ds.fetch({
      page: 1,
      pageSize: 10,
      sort: [{ columnId: 'name', direction: 'asc' }],
      filter: { global: 'a' },
    });

    // Alice(30), Charlie(35), Diana(28) — 有 'a' 或 'A'
    expect(result.data.length).toBeGreaterThanOrEqual(2);
    expect(result.filtered).toBe(result.data.length);
  });

  it('超過總頁數時回傳空陣列', async () => {
    const ds = createStaticDatasource(data);
    const result = await ds.fetch({ page: 100, pageSize: 2 });

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(5);
  });

  it('支援 columnAccessor 對應到物件屬性', async () => {
    const ds = createStaticDatasource(data, {
      columnAccessors: { age: (row: User) => row.age },
    });
    const result = await ds.fetch({
      page: 1,
      pageSize: 10,
      sort: [{ columnId: 'age', direction: 'asc' }],
    });

    expect(result.data[0].age).toBe(22);
  });
});
