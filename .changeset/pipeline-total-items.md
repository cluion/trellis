---
"@trellisjs/core": patch
---

修正 Transform Pipeline 在沒有 pagination 插件時的結果，以及重複通知。

- 沒有 pagination 插件時，`pagination.totalItems` 改為篩選後的筆數（原本是原始資料筆數），`TableInfo` 顯示的總數才會正確
- priority >= 30 的切片 transform（如 virtualScroll）不再影響 `getFilteredData()`；原本沒有分頁時，CSV 匯出與剪貼簿只會拿到可視範圍的列
- `recompute()` 只通知 subscriber 一次；原本會先收到資料尚未更新的中間狀態，多觸發一次 render
