import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  TrellisQuery,
  TrellisResponse,
  TrellisSortQuery,
  TrellisFilterQuery,
} from '../src/types';

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
