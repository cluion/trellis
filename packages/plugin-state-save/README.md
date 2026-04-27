# @trellisjs/plugin-state-save

Trellis 狀態保存插件 — 自動將表格 UI 狀態持久化到瀏覽器 storage，頁面重載後恢復。

## 安裝

```bash
pnpm add @trellisjs/plugin-state-save
```

## 使用方式

### 基本用法

```typescript
import { createStateSavePlugin } from '@trellisjs/plugin-state-save';

const plugin = createStateSavePlugin();
```

插件會自動：
- 安裝時從 localStorage 恢復先前保存的狀態（排序、篩選、分頁、欄位可見性、展開行）
- 狀態變更時以 300ms 防抖延遲保存到 localStorage
- 表格銷毀時取消訂閱和定時器

### 自訂選項

```typescript
createStateSavePlugin({
  storage: 'sessionStorage', // 或自訂 StorageAdapter
  key: 'my-table-state',     // storage key，預設 'trellis-state'
  saveFields: ['sorting', 'pagination', 'columnPinning', 'columnResizing'],
  debounceMs: 500,
  autoRestore: true,
});
```

### Storage 選項

| 值 | 說明 |
|---|---|
| `'localStorage'` | 預設，跨頁面刷新保留 |
| `'sessionStorage'` | 只在當前 session 有效 |
| `StorageAdapter` | 自訂實作（IndexedDB、記憶體等） |

### saveFields 支援欄位

預設保存：`sorting`、`filtering`、`pagination`、`columnVisibility`、`expandedRows`

可額外指定：`columnPinning`、`columnResizing`（需搭配對應插件）

### 手動事件

```typescript
// 立即保存（取消 debounce，直接寫入）
api.emit('state:save', undefined);

// 手動恢復
api.emit('state:restore', undefined);

// 清除保存的狀態
api.emit('state:clear', undefined);
```

### 自訂 StorageAdapter

```typescript
import type { StorageAdapter } from '@trellisjs/plugin-state-save';

const myAdapter: StorageAdapter = {
  getItem: (key) => myDB.get(key),
  setItem: (key, value) => myDB.set(key, value),
  removeItem: (key) => myDB.delete(key),
};

createStateSavePlugin({ storage: myAdapter });
```

## SSR 安全

在 Node.js 環境（`typeof window === 'undefined'`）中，插件使用 no-op adapter，不會報錯。

## 序列化

- `Set` 型別（expandedRows、selection）自動轉為 Array 保存，恢復時轉回 Set
- 保存的資料包含 `savedAt` timestamp（Unix 毫秒）
- 損壞的 JSON 優雅處理，回傳 null 不報錯
