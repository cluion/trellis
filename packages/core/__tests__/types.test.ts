import { describe, it, expectTypeOf } from 'vitest';
import type {
  ColumnDef,
  ColumnSortFn,
  DataRow,
  DataId,
  SortState,
  FilterState,
  PaginationState,
  TableState,
} from '../src/types';

describe('核心型別', () => {
  describe('ColumnDef', () => {
    it('接受字串存取器的欄位定義', () => {
      type User = { name: string; age: number };
      const col: ColumnDef<User> = {
        id: 'name',
        accessor: 'name',
        header: 'Name',
      };
      expectTypeOf(col.id).toBeString();
    });

    it('接受函式存取器的欄位定義', () => {
      type User = { name: string; age: number };
      const col: ColumnDef<User> = {
        id: 'displayName',
        accessor: (row) => `${row.name} (${row.age})`,
        header: 'Display Name',
        sortable: true,
      };
      expectTypeOf(col.id).toBeString();
    });
  });

  describe('DataRow', () => {
    it('將原始資料包裝成帶有詮釋資料的列', () => {
      type User = { name: string };
      const row: DataRow<User> = {
        id: '0',
        original: { name: 'Alice' },
        index: 0,
      };
      expectTypeOf(row.id).toBeString();
      expectTypeOf(row.original).toMatchTypeOf<{ name: string }>();
      expectTypeOf(row.index).toBeNumber();
    });
  });

  describe('TableState', () => {
    it('組合所有子狀態', () => {
      type User = { name: string; age: number };
      const state: TableState<User> = {
        data: [],
        columns: [],
        sorting: { columnId: '', direction: null },
        filtering: { query: '', columnFilters: {} },
        pagination: { page: 1, pageSize: 10 },
        selection: new Set(),
      };
      expectTypeOf(state.data).toBeArray();
      expectTypeOf(state.sorting.direction).toEqualTypeOf<'asc' | 'desc' | null>();
      expectTypeOf(state.pagination.page).toBeNumber();
    });
  });
});
