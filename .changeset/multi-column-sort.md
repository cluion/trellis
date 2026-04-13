---
"@trellisjs/core": major
"@trellisjs/plugin-sort": major
"@trellisjs/plugin-datasource": minor
---

BREAKING: SortState 改為多欄排序結構 (sortBy: SortCriterion[])

- `SortState.columnId` + `direction` 移除，改為 `SortState.sortBy: SortCriterion[]`
- 新增 `SortCriterion` 介面：`{ columnId: string; direction: 'asc' | 'desc' }`
- sort 插件支援 `append` 模式（Shift+Click 追加排序條件）
- transform 邏輯依 sortBy 陣列逐一比較，第一個非零結果決定順序
- plugin-datasource 的 `buildQueryFromState` 直接傳遞 sortBy 陣列
