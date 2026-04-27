import { describe, it, expect } from 'vitest';
import { serializeState, deserializeState } from '../src/state-save-plugin';
import { createStorageAdapter, loadSavedState, saveToStorage } from '../src/storage';
import type { TableState, SortState, PaginationState, FilterState } from '@trellisjs/core';
import type { SavedState } from '../src/storage';

function makeState(partial: Partial<TableState> = {}): TableState {
  return {
    data: [],
    columns: [],
    sorting: { sortBy: [] },
    filtering: { query: '', columnFilters: {} },
    pagination: { page: 1, pageSize: 10, totalItems: 0 },
    selection: new Set(),
    columnVisibility: {},
    columnPinning: { left: [], right: [] },
    expandedRows: new Set(),
    ...partial,
  } as TableState;
}

describe('serializeState', () => {
  it('Set 轉為 Array', () => {
    const state = makeState({ expandedRows: new Set(['row1', 'row2']) });
    const result = serializeState(state, ['expandedRows']);
    expect(result.expandedRows).toEqual(['row1', 'row2']);
  });

  it('saveFields 過濾 — 只序列化指定欄位', () => {
    const state = makeState({
      sorting: { sortBy: [{ columnId: 'name', direction: 'asc' as const }] },
      pagination: { page: 3, pageSize: 20, totalItems: 100 },
    });
    const result = serializeState(state, ['sorting']);
    expect(result.sorting).toEqual({ sortBy: [{ columnId: 'name', direction: 'asc' }] });
    expect(result.pagination).toBeUndefined();
  });

  it('包含 columnPinning 和 columnResizing', () => {
    const state = makeState({
      columnPinning: { left: ['col1'], right: ['col3'] },
      columnResizing: { columnWidths: { col1: 200 }, resizingColumn: null, minWidth: 50, defaultWidth: 150 },
    });
    const result = serializeState(state, ['columnPinning', 'columnResizing']);
    expect(result.columnPinning).toEqual({ left: ['col1'], right: ['col3'] });
    expect(result.columnResizing).toEqual({
      columnWidths: { col1: 200 },
      resizingColumn: null,
      minWidth: 50,
      defaultWidth: 150,
    });
  });

  it('包含 savedAt timestamp', () => {
    const state = makeState();
    const result = serializeState(state, ['sorting']);
    expect(typeof result.savedAt).toBe('number');
    expect(result.savedAt).toBeLessThanOrEqual(Date.now());
  });

  it('不存在的 saveFields 不報錯', () => {
    const state = makeState();
    expect(() => serializeState(state, ['columnResizing'] as (keyof TableState)[])).not.toThrow();
    const result = serializeState(state, ['columnResizing'] as (keyof TableState)[]);
    expect(result.columnResizing).toBeUndefined();
  });
});

describe('deserializeState', () => {
  it('Array 轉回 Set', () => {
    const saved: SavedState = { savedAt: Date.now(), expandedRows: ['row1', 'row2'] };
    const result = deserializeState(saved, ['expandedRows']);
    expect(result.expandedRows).toBeInstanceOf(Set);
    expect(result.expandedRows).toEqual(new Set(['row1', 'row2']));
  });

  it('反序列化 sorting', () => {
    const saved: SavedState = {
      savedAt: Date.now(),
      sorting: { sortBy: [{ columnId: 'name', direction: 'desc' }] },
    };
    const result = deserializeState(saved, ['sorting']);
    expect(result.sorting).toEqual({ sortBy: [{ columnId: 'name', direction: 'desc' }] });
  });

  it('損壞的 JSON — 不在 deserializeState 處理（loadSavedState 處理）', () => {
    // deserializeState 接收的是已解析的物件，損壞 JSON 由 loadSavedState 處理
    const saved: SavedState = { savedAt: Date.now() };
    const result = deserializeState(saved, ['sorting']);
    expect(result.sorting).toBeUndefined();
  });
});

describe('createStorageAdapter', () => {
  it('SSR no-op adapter', () => {
    // 在 Node.js 環境中，typeof window === 'undefined'
    const adapter = createStorageAdapter();
    expect(adapter.getItem('test')).toBeNull();
    expect(() => adapter.setItem('test', 'val')).not.toThrow();
    expect(() => adapter.removeItem('test')).not.toThrow();
  });

  it('自訂 StorageAdapter', () => {
    const store = new Map<string, string>();
    const custom = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    };
    const adapter = createStorageAdapter(custom);
    adapter.setItem('foo', 'bar');
    expect(adapter.getItem('foo')).toBe('bar');
    adapter.removeItem('foo');
    expect(adapter.getItem('foo')).toBeNull();
  });
});

describe('loadSavedState', () => {
  it('有效 JSON 回傳解析結果', () => {
    const store = new Map<string, string>();
    store.set('key', JSON.stringify({ savedAt: 123456789, sorting: { sortBy: [] } }));
    const adapter = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: () => {},
      removeItem: () => {},
    };
    const result = loadSavedState(adapter, 'key');
    expect(result).not.toBeNull();
    expect(result!.savedAt).toBe(123456789);
  });

  it('損壞 JSON 回傳 null', () => {
    const store = new Map<string, string>();
    store.set('key', '{invalid json');
    const adapter = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadSavedState(adapter, 'key')).toBeNull();
  });

  it('無保存資料回傳 null', () => {
    const adapter = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadSavedState(adapter, 'key')).toBeNull();
  });
});
