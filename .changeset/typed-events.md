---
"@trellisjs/core": minor
"@trellisjs/plugin-clipboard": minor
"@trellisjs/plugin-column-pinning": minor
"@trellisjs/plugin-column-resizing": minor
"@trellisjs/plugin-column-visibility": minor
"@trellisjs/plugin-export-csv": minor
"@trellisjs/plugin-filter": minor
"@trellisjs/plugin-inline-edit": minor
"@trellisjs/plugin-pagination": minor
"@trellisjs/plugin-row-expansion": minor
"@trellisjs/plugin-selection": minor
"@trellisjs/plugin-sort": minor
"@trellisjs/plugin-state-save": minor
---

事件 payload 自動帶型別。

- core 新增 `TrellisEventMap`：`api.on()` 的 handler 會收到該事件的 payload 型別，`api.emit()` 會檢查 payload，寫錯就編譯失敗
- 各插件以 module augmentation 登記自己的事件，並匯出 payload 型別（如 `SortChangePayload`、`FilterChangePayload`、`PaginationGotoPayload`、`InlineEditKeydownPayload`），import 插件後即可使用
- 沒有 payload 的指令（如 `pagination:next`、`state:save`）可省略第二個參數，既有的 `null`、`{}`、`undefined` 寫法照常可用
- 未登記的事件維持原本行為，payload 為 `unknown`；自訂插件可用同樣方式登記事件
- 執行期行為不變
