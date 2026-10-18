---
"@trellisjs/plugin-inline-edit": major
---

新增 `@trellisjs/plugin-inline-edit` 插件 — 無頭式內聯編輯功能。

- 雙擊或點擊儲存格進入編輯模式（`trigger: 'click' | 'dblclick'`）
- Enter 確認、Escape 取消、Tab/Shift+Tab 導航至下一個可編輯儲存格
- 欄位層級驗證（`validate` 回呼）
- 切換儲存格行為（`editBehavior: 'cancel' | 'commit'`）
- 事件驅動：`inline-edit:save`、`inline-edit:stop`、`inline-edit:error`
- 程式化控制：`inline-edit:commit`、`inline-edit:cancel`
