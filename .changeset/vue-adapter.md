---
"@trellisjs/vue": major
---

新增 `@trellisjs/vue` — Vue 3 適配器。

- `useTrellis()` 建立實例並自動 provide 給子元件；回傳 `api` 與唯讀的 `state` ref，元件卸載時自動銷毀
- `data` 可以是陣列、ref 或 getter；換成新陣列或增刪列時自動同步
- `provideTrellis()`、`useTrellisContext()`、`useTrellisState()`、`useVirtualScroll()`
- 12 個元件：`TlTable`、`TlTableHead`、`TlTableBody`、`TlVirtualScrollBody`、`TlTr`、`TlTh`、`TlTd`、`TlTableInfo`、`TlExpansionToggle`、`TlExpansionRow`、`TlResizeHandle`、`TlSlotRenderer`，結構、CSS class 與行為都跟 React 版一致
