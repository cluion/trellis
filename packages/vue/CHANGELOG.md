# @trellisjs/vue

## 1.1.0

### Minor Changes

- [#37](https://github.com/cluion/trellis/pull/37) [`8521e38`](https://github.com/cluion/trellis/commit/8521e382d872312e347a199b38be63b1b647f973) Thanks [@cluion](https://github.com/cluion)! - Custom cell and header content.

    - core: `ColumnDef` gains `renderCell(context)` and `renderHeader(context)`, with new `CellContext` (`row`, `value`, `column`, `api`) and `HeaderContext` (`column`, `api`) types. `header` stays a string, so CSV export and clipboard keep using it.
    - react: `Td` and `Th` render the returned React node; without these functions cells show the value as a string and headers show `header`, as before.
    - vue: `TlTd` and `TlTh` render the returned VNode, and `TlTable` accepts `#cell-{columnId}`, `#cell`, `#header-{columnId}` and `#header` scoped slots, which take priority over the column functions.

## 1.0.0

### Major Changes

- [#33](https://github.com/cluion/trellis/pull/33) [`22f81a3`](https://github.com/cluion/trellis/commit/22f81a329e651428cb430e1125b6e7f0796fb6a3) Thanks [@cluion](https://github.com/cluion)! - 新增 `@trellisjs/vue` — Vue 3 適配器。

    - `useTrellis()` 建立實例並自動 provide 給子元件；回傳 `api` 與唯讀的 `state` ref，元件卸載時自動銷毀
    - `data` 可以是陣列、ref 或 getter；換成新陣列或增刪列時自動同步
    - `provideTrellis()`、`useTrellisContext()`、`useTrellisState()`、`useVirtualScroll()`
    - 12 個元件：`TlTable`、`TlTableHead`、`TlTableBody`、`TlVirtualScrollBody`、`TlTr`、`TlTh`、`TlTd`、`TlTableInfo`、`TlExpansionToggle`、`TlExpansionRow`、`TlResizeHandle`、`TlSlotRenderer`，結構、CSS class 與行為都跟 React 版一致
