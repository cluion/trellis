---
"@trellisjs/plugin-filter": minor
---

新增單欄篩選功能（`filter:column` 事件）

- 新增 `filter:column` 事件：`{ columnId: string, value: string }` 設定/清除個別欄位篩選
- 全域搜尋與單欄篩選為 AND 關係
- 完全向後相容 — 不使用 `filter:column` 則行為不變
