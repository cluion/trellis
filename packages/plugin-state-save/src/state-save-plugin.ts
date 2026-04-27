import type { TableState, TrellisAPI, TrellisPlugin } from '@trellisjs/core';
import type { StorageAdapter, SavedState } from './storage';
import { createStorageAdapter, loadSavedState, saveToStorage } from './storage';

export interface StateSaveOptions {
  storage?: 'localStorage' | 'sessionStorage' | StorageAdapter;
  key?: string;
  saveFields?: (keyof TableState)[];
  debounceMs?: number;
  autoRestore?: boolean;
}

type SerializableField = keyof TableState;

const DEFAULT_SAVE_FIELDS: SerializableField[] = [
  'sorting',
  'filtering',
  'pagination',
  'columnVisibility',
  'expandedRows',
];

/** 將 TableState 中指定欄位序列化為可 JSON 化的物件 */
export function serializeState(
  state: TableState,
  fields: SerializableField[],
): SavedState {
  const result: SavedState = { savedAt: Date.now() };
  for (const field of fields) {
    const value = state[field];
    if (value === undefined) continue;
    if (value instanceof Set) {
      (result as Record<string, unknown>)[field] = Array.from(value);
    } else {
      (result as Record<string, unknown>)[field] = value;
    }
  }
  return result;
}

/** 將保存的資料反序列化回 TableState 格式 */
export function deserializeState(
  saved: SavedState,
  fields: SerializableField[],
): Partial<TableState> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = saved[field];
    if (value === undefined) continue;
    // expandedRows / selection 都是 Set → 需要從 Array 轉回
    if ((field === 'expandedRows' || field === 'selection') && Array.isArray(value)) {
      result[field] = new Set(value);
    } else {
      result[field] = value;
    }
  }
  return result as Partial<TableState>;
}

/** 簡易防抖 */
export function debounce(fn: () => void, ms: number): { call: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    call() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, ms);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

export function createStateSavePlugin(options: StateSaveOptions = {}): TrellisPlugin {
  const {
    storage: storageOpt,
    key = 'trellis-state',
    saveFields = DEFAULT_SAVE_FIELDS,
    debounceMs = 300,
    autoRestore = true,
  } = options;

  let adapter!: StorageAdapter;
  let unsub: (() => void) | undefined;
  let debouncer!: ReturnType<typeof debounce>;

  return {
    name: 'state-save',

    install(api: TrellisAPI) {
      adapter = createStorageAdapter(storageOpt);

      // autoRestore
      if (autoRestore) {
        const saved = loadSavedState(adapter, key);
        if (saved) {
          const restored = deserializeState(saved, saveFields);
          api.recompute(restored);
        }
      }

      // 防抖自動保存
      debouncer = debounce(() => {
        const state = api.getState();
        const serialized = serializeState(state, saveFields);
        saveToStorage(adapter, key, serialized);
      }, debounceMs);

      unsub = api.subscribe(() => {
        debouncer.call();
      });

      // 手動事件
      api.on('state:save', () => {
        debouncer.cancel();
        const state = api.getState();
        const serialized = serializeState(state, saveFields);
        saveToStorage(adapter, key, serialized);
      });

      api.on('state:restore', () => {
        const saved = loadSavedState(adapter, key);
        if (saved) {
          const restored = deserializeState(saved, saveFields);
          api.recompute(restored);
        }
      });

      api.on('state:clear', () => {
        debouncer.cancel();
        adapter.removeItem(key);
      });
    },

    destroy() {
      unsub?.();
      debouncer?.cancel();
    },
  };
}
