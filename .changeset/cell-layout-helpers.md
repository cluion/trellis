---
"@trellisjs/core": minor
"@trellisjs/react": patch
---

core 新增框架無關的儲存格輔助函式，React 與 Vue 適配器共用。

- `getHeaderCellLayout()`：表頭儲存格的樣式與 class（欄寬、對齊、固定表頭、欄釘選、調整欄寬）
- `getBodyCellLayout()`：資料儲存格的樣式與 class（對齊、欄釘選）
- `getCellValue()`：依欄位 accessor 取出儲存格的值
- 修正 react：同時啟用調整欄寬時，釘選欄的表頭與固定表頭不再失去 sticky 定位
