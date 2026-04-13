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
  EventHandler,
  SlotRenderer,
  SlotContext,
  TrellisPlugin,
  TrellisAPI,
  TrellisOptions,
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
        sorting: { sortBy: [] },
        filtering: { query: '', columnFilters: {} },
        pagination: { page: 1, pageSize: 10 },
        selection: new Set(),
      };
      expectTypeOf(state.data).toBeArray();
      expectTypeOf(state.sorting.sortBy).toEqualTypeOf<{ columnId: string; direction: 'asc' | 'desc' }[]>();
      expectTypeOf(state.pagination.page).toBeNumber();
    });
  });

  describe('事件型別', () => {
    it('EventHandler 接受任意參數', () => {
      const handler: EventHandler = (payload: unknown) => {};
      expectTypeOf(handler).toBeFunction();
    });
  });

  describe('插槽型別', () => {
    it('SlotRenderer 接收 context 並回傳可渲染內容', () => {
      const renderer: SlotRenderer = (ctx: SlotContext) => {
        return ctx.value;
      };
      expectTypeOf(renderer).toBeFunction();
    });

    it('SlotContext 包含 column、row 和 value', () => {
      const ctx: SlotContext = {
        column: { id: 'name', header: 'Name' },
        row: { id: '0', original: {}, index: 0 },
        value: 'Alice',
        data: {},
      };
      expectTypeOf(ctx).toBeObject();
    });
  });

  describe('插件型別', () => {
    it('TrellisPlugin 有 name 和 install', () => {
      const plugin: TrellisPlugin = {
        name: 'test-plugin',
        install: (api: TrellisAPI) => {
          api.registerSlot('test', () => null);
        },
      };
      expectTypeOf(plugin.name).toBeString();
    });

    it('TrellisOptions 需要 data 和 columns', () => {
      type User = { name: string };
      const options: TrellisOptions<User> = {
        data: [{ name: 'Alice' }],
        columns: [{ id: 'name', accessor: 'name', header: 'Name' }],
      };
      expectTypeOf(options.data).toBeArray();
    });
  });
});
