# @trellisjs/plugin-inline-edit

Trellis 的內聯編輯插件 — 直接在表格儲存格上編輯資料。

## 安裝

```bash
npm install @trellisjs/plugin-inline-edit
```

## 基本用法

```ts
import { createInlineEditPlugin } from '@trellisjs/plugin-inline-edit';

const plugin = createInlineEditPlugin({
  trigger: 'dblclick',       // 'click' | 'dblclick'（預設 'dblclick'）
  editable: (colId, row) => colId !== 'id',  // 控制哪些欄位可編輯
  editBehavior: 'commit',    // 'cancel' | 'commit'（預設 'cancel'）
  validate: (colId, value, row) => {
    if (colId === 'name' && typeof value === 'string' && value.trim() === '') {
      return '此欄位必填';
    }
    return null;  // null 表示驗證通過
  },
});

const trellis = new Trellis({ data, columns, plugins: [plugin] });
```

## 監聽事件

```ts
// 編輯確認時由消費者決定如何更新資料
trellis.api.on('inline-edit:save', ({ rowId, columnId, value, oldValue }) => {
  console.log(`欄位 ${columnId} 從 "${oldValue}" 更新為 "${value}"`);
  trellis.api.updateRow(rowId, { [columnId]: value });
});

// 驗證失敗
trellis.api.on('inline-edit:error', ({ rowId, columnId, value, error }) => {
  console.error(`驗證失敗：${error}`);
});

// 編輯結束（確認或取消都會觸發）
trellis.api.on('inline-edit:stop', ({ rowId, columnId }) => {
  console.log(`停止編輯 ${rowId}.${columnId}`);
});
```

## 事件一覽

Payload 透過 `TrellisEventMap` 自動帶型別：import 這個插件後，`api.on()` 與 `api.emit()` 就會推斷出型別。可 import 的 payload 型別：`InlineEditStartPayload`、`InlineEditSavePayload`、`InlineEditStopPayload`、`InlineEditErrorPayload`、`InlineEditKeydownPayload`、`InlineEditUpdatePayload`。

| 事件 | Payload | 說明 |
|------|---------|------|
| `inline-edit:start` | `{ rowId, columnId, value }` | 進入編輯模式 |
| `inline-edit:save` | `{ rowId, columnId, value, oldValue }` | 編輯確認 |
| `inline-edit:stop` | `{ rowId, columnId }` | 編輯結束 |
| `inline-edit:error` | `{ rowId, columnId, value, error }` | 驗證失敗 |
| `inline-edit:commit` | — | 程式化確認 |
| `inline-edit:cancel` | — | 程式化取消 |
| `inline-edit:update` | `{ value }` | 更新編輯中的值 |
| `inline-edit:keydown` | `{ key, shiftKey? }` | 鍵盤事件 |

## 鍵盤操作

| 按鍵 | 行為 |
|------|------|
| Enter | 確認編輯 |
| Escape | 取消編輯 |
| Tab | 確認並跳至下一個可編輯儲存格 |
| Shift+Tab | 確認並跳至上一個可編輯儲存格 |

## 選項

```ts
interface InlineEditPluginOptions {
  // 觸發模式：'click' 或 'dblclick'（預設 'dblclick'）
  trigger?: 'click' | 'dblclick';

  // 判斷欄位是否可編輯（預設所有欄位可編輯）
  editable?: (columnId: string, row: DataRow) => boolean;

  // 驗證函式，回傳 null 表示通過，回傳字串表示錯誤訊息
  validate?: (columnId: string, value: unknown, row: DataRow) => string | null;

  // 切換儲存格時的行為（預設 'cancel'）
  // 'cancel'：取消前一個編輯
  // 'commit'：確認前一個編輯
  editBehavior?: 'cancel' | 'commit';
}
```

## Tab 導航

Tab 鍵按照 `state.columns` 的順序導航，自動跳過不可編輯的欄位：

- 同行有下一個可編輯欄位 → 跳至該欄位
- 同行沒有下一個 → 跳至下一行第一個可編輯欄位
- 最後一行最後一格 → 確認並結束編輯
- Shift+Tab 反向導航

## 無頭設計

這是 headless 插件 — 不提供 UI 元件。框架適配器（React）透過事件和 Slot 系統渲染輸入元件。
