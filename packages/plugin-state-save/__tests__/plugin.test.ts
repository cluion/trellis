import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStateSavePlugin } from '../src/state-save-plugin';
import type { StorageAdapter } from '../src/storage';
import type { TrellisAPI, TableState } from '@trellisjs/core';

function createStore(): Map<string, string> {
  return new Map();
}

function createAdapter(store: Map<string, string>): StorageAdapter {
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

function createMockApi(): {
  api: TrellisAPI;
  state: TableState;
  listeners: Map<string, Set<(state: TableState) => void>>;
  eventHandlers: Map<string, Set<(payload?: unknown) => void>>;
  recomputeCalls: Partial<TableState>[];
} {
  const state: TableState = {
    data: [],
    columns: [],
    sorting: { sortBy: [] },
    filtering: { query: '', columnFilters: {} },
    pagination: { page: 1, pageSize: 10, totalItems: 0 },
    selection: new Set(),
    columnVisibility: {},
    columnPinning: { left: [], right: [] },
    expandedRows: new Set(),
  };

  const listeners = new Map<string, Set<(state: TableState) => void>>();
  const eventHandlers = new Map<string, Set<(payload?: unknown) => void>>();
  const recomputeCalls: Partial<TableState>[] = [];

  const api: TrellisAPI = {
    getState: () => state,
    setState: (updater) => {
      Object.assign(state, updater(state));
    },
    subscribe: (listener) => {
      const id = String(listeners.size);
      const set = new Set<(s: TableState) => void>();
      set.add(listener);
      listeners.set(id, set);
      return () => set.delete(listener);
    },
    on: (event, handler) => {
      if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
      eventHandlers.get(event)!.add(handler);
      return () => eventHandlers.get(event)!.delete(handler);
    },
    emit: (event, payload) => {
      const handlers = eventHandlers.get(event);
      if (handlers) handlers.forEach((h) => h(payload));
    },
    recompute: (withState) => {
      if (withState) recomputeCalls.push(withState);
    },
    registerSlot: () => () => {},
    getSlot: () => undefined,
    registerTransform: () => {},
    updateSourceData: () => {},
    addRow: () => {},
    removeRow: () => {},
    updateRow: () => {},
    getFilteredData: () => [],
  };

  return { api, state, listeners, eventHandlers, recomputeCalls };
}

describe('createStateSavePlugin', () => {
  let store: Map<string, string>;
  let adapter: StorageAdapter;

  beforeEach(() => {
    store = createStore();
    adapter = createAdapter(store);
  });

  it('autoRestore — 安裝時恢復保存的狀態', () => {
    const saved = JSON.stringify({
      savedAt: Date.now(),
      sorting: { sortBy: [{ columnId: 'name', direction: 'asc' }] },
    });
    store.set('trellis-state', saved);

    const plugin = createStateSavePlugin({ storage: adapter });
    const { api, recomputeCalls } = createMockApi();
    plugin.install(api);

    expect(recomputeCalls.length).toBe(1);
    expect(recomputeCalls[0].sorting).toEqual({
      sortBy: [{ columnId: 'name', direction: 'asc' }],
    });
  });

  it('autoRestore false — 不嘗試恢復', () => {
    const saved = JSON.stringify({ savedAt: Date.now(), sorting: { sortBy: [{ columnId: 'name', direction: 'asc' }] } });
    store.set('trellis-state', saved);

    const plugin = createStateSavePlugin({ storage: adapter, autoRestore: false });
    const { api, recomputeCalls } = createMockApi();
    plugin.install(api);

    expect(recomputeCalls.length).toBe(0);
  });

  it('subscribe 觸發防抖保存', async () => {
    vi.useFakeTimers();
    const plugin = createStateSavePlugin({ storage: adapter, debounceMs: 100 });
    const { api, listeners } = createMockApi();
    plugin.install(api);

    // 模擬狀態變更觸發 subscribe
    const listenerSet = listeners.values().next().value;
    if (listenerSet) {
      listenerSet.forEach((fn) => fn(api.getState()));
    }

    // debounce 未到期，不應該保存
    expect(store.has('trellis-state')).toBe(false);

    // 等待 debounce 完成
    vi.advanceTimersByTime(150);

    expect(store.has('trellis-state')).toBe(true);
    const saved = JSON.parse(store.get('trellis-state')!);
    expect(saved.savedAt).toBeDefined();
    expect(saved.sorting).toEqual({ sortBy: [] });

    vi.useRealTimers();
  });

  it('手動 state:save 立即保存', () => {
    const plugin = createStateSavePlugin({ storage: adapter, debounceMs: 9999 });
    const { api, eventHandlers } = createMockApi();
    plugin.install(api);

    // emit state:save
    const handlers = eventHandlers.get('state:save');
    expect(handlers).toBeDefined();
    handlers!.forEach((h) => h(undefined));

    expect(store.has('trellis-state')).toBe(true);
  });

  it('手動 state:restore 恢復狀態', () => {
    const saved = JSON.stringify({
      savedAt: Date.now(),
      pagination: { page: 5, pageSize: 20, totalItems: 100 },
    });
    store.set('trellis-state', saved);

    const plugin = createStateSavePlugin({ storage: adapter, autoRestore: false });
    const { api, eventHandlers, recomputeCalls } = createMockApi();
    plugin.install(api);

    const handlers = eventHandlers.get('state:restore');
    handlers!.forEach((h) => h(undefined));

    expect(recomputeCalls.length).toBe(1);
    expect(recomputeCalls[0].pagination).toEqual({ page: 5, pageSize: 20, totalItems: 100 });
  });

  it('state:clear 清除保存', () => {
    store.set('trellis-state', '{"savedAt":1}');
    const plugin = createStateSavePlugin({ storage: adapter });
    const { api, eventHandlers } = createMockApi();
    plugin.install(api);

    const handlers = eventHandlers.get('state:clear');
    handlers!.forEach((h) => h(undefined));

    expect(store.has('trellis-state')).toBe(false);
  });

  it('destroy 取消訂閱和防抖', () => {
    vi.useFakeTimers();
    const plugin = createStateSavePlugin({ storage: adapter, debounceMs: 100 });
    const { api } = createMockApi();
    plugin.install(api);

    plugin.destroy?.();

    // destroy 後不應有任何問題
    vi.advanceTimersByTime(200);
    expect(store.has('trellis-state')).toBe(false);

    vi.useRealTimers();
  });

  it('自訂 key 選項', () => {
    const plugin = createStateSavePlugin({ storage: adapter, key: 'my-table' });
    const { api, eventHandlers } = createMockApi();
    plugin.install(api);

    const handlers = eventHandlers.get('state:save');
    handlers!.forEach((h) => h(undefined));

    expect(store.has('my-table')).toBe(true);
    expect(store.has('trellis-state')).toBe(false);
  });

  it('不存在的 saveFields 不報錯', () => {
    const plugin = createStateSavePlugin({
      storage: adapter,
      saveFields: ['columnResizing'] as (keyof TableState)[],
    });
    const { api, eventHandlers } = createMockApi();
    plugin.install(api);

    expect(() => {
      const handlers = eventHandlers.get('state:save');
      handlers!.forEach((h) => h(undefined));
    }).not.toThrow();

    const saved = JSON.parse(store.get('trellis-state')!);
    expect(saved.savedAt).toBeDefined();
    // columnResizing 不存在於 state，不會被序列化
    expect(saved.columnResizing).toBeUndefined();
  });
});
