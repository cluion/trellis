---
"@trellisjs/core": minor
"@trellisjs/react": minor
"@trellisjs/plugin-column-pinning": patch
---

修正釘選欄調整寬度後，後面的釘選欄位移沒有更新、兩欄重疊的問題。

- core：`calculatePinOffsets()` 新增可選參數 `columnResizing`，有傳入時改用調整後的欄寬；啟用調整欄寬、但欄位沒有 `width` 時改用 `defaultWidth`。`getHeaderCellLayout()`、`getBodyCellLayout()` 會自動傳入，所以 React 與 Vue 的表格元件都已修正
- plugin-column-pinning：`getPinOffsets(state)` 改用調整後的欄寬
- react：`Table` 新增 `className` 與 `style` props，套用到外層元素；有釘選欄時把 `max-height` 設在這裡，固定表頭才會生效
- 文件：補上固定表頭與釘選欄需要不透明背景、高度限制要設在表格元件上，以及釘選欄寬度的決定順序
