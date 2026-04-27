/** Storage 抽象介面 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 保存的狀態結構 */
export interface SavedState {
  savedAt: number;
  [field: string]: unknown;
}

const noopAdapter: StorageAdapter = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function createBrowserAdapter(type: 'localStorage' | 'sessionStorage'): StorageAdapter {
  const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
  };
}

/** 從字串快捷方式或自訂物件建立 StorageAdapter */
export function createStorageAdapter(
  storage?: 'localStorage' | 'sessionStorage' | StorageAdapter,
): StorageAdapter {
  if (typeof storage === 'object' && storage !== null) return storage;
  if (typeof window === 'undefined') return noopAdapter;
  if (!storage || storage === 'localStorage') return createBrowserAdapter('localStorage');
  if (storage === 'sessionStorage') return createBrowserAdapter('sessionStorage');
  return noopAdapter;
}

/** 從 storage 載入保存的狀態，解析失敗回傳 null */
export function loadSavedState(
  adapter: StorageAdapter,
  key: string,
): SavedState | null {
  const raw = adapter.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedState;
    if (typeof parsed.savedAt === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}

/** 將狀態序列化並寫入 storage */
export function saveToStorage(
  adapter: StorageAdapter,
  key: string,
  state: SavedState,
): void {
  adapter.setItem(key, JSON.stringify(state));
}
