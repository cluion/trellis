import { describe, it, expect, expectTypeOf } from 'vitest';
import { Trellis } from '@trellisjs/core';
import type {
  TrellisQuery,
  TrellisResponse,
  TrellisSortQuery,
  TrellisFilterQuery,
} from '../src/types';
import { buildQueryFromState } from '../src/types';

describe('資料源型別定義', () => {
  it('TrellisQuery 包含分頁、排序、篩選', () => {
    const query: TrellisQuery = {
      page: 1,
      pageSize: 10,
      sort: [{ columnId: 'name', direction: 'asc' }],
      filter: { global: 'alice', columns: { age: 25 } },
    };
    expect(query.page).toBe(1);
    expect(query.sort).toHaveLength(1);
  });

  it('TrellisResponse 包含 data、total、filtered', () => {
    const res: TrellisResponse = {
      data: [{ name: 'Alice' }],
      total: 100,
      filtered: 1,
    };
    expectTypeOf(res.data).toBeArray();
    expectTypeOf(res.total).toBeNumber();
    expectTypeOf(res.filtered).toBeNumber();
  });

  it('TrellisQuery 可以只有分頁（無排序篩選）', () => {
    const query: TrellisQuery = { page: 2, pageSize: 25 };
    expect(query.sort).toBeUndefined();
    expect(query.filter).toBeUndefined();
  });
});

describe('buildQueryFromState', () => {
  it('從狀態建構完整查詢', () => {
    const trellis = new Trellis({
      data: [{ name: 'Alice', age: 30 }],
      columns: [{ id: 'name', accessor: 'name', header: 'Name' }],
    });

    trellis.api.setState(() => ({
      sorting: { columnId: 'name', direction: 'asc' },
      filtering: { query: 'alice', columnFilters: {} },
      pagination: { page: 2, pageSize: 10 },
    }));

    const query = buildQueryFromState(trellis.api);

    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(10);
    expect(query.sort).toEqual([{ columnId: 'name', direction: 'asc' }]);
    expect(query.filter?.global).toBe('alice');
  });

  it('無排序無篩選時只回傳分頁', () => {
    const trellis = new Trellis({
      data: [{ name: 'Alice' }],
      columns: [{ id: 'name', accessor: 'name', header: 'Name' }],
    });

    const query = buildQueryFromState(trellis.api);

    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(10);
    expect(query.sort).toBeUndefined();
    expect(query.filter).toBeUndefined();
  });
});
