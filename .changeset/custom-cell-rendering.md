---
"@trellisjs/core": minor
"@trellisjs/react": minor
"@trellisjs/vue": minor
---

Custom cell and header content.

- core: `ColumnDef` gains `renderCell(context)` and `renderHeader(context)`, with new `CellContext` (`row`, `value`, `column`, `api`) and `HeaderContext` (`column`, `api`) types. `header` stays a string, so CSV export and clipboard keep using it.
- react: `Td` and `Th` render the returned React node; without these functions cells show the value as a string and headers show `header`, as before.
- vue: `TlTd` and `TlTh` render the returned VNode, and `TlTable` accepts `#cell-{columnId}`, `#cell`, `#header-{columnId}` and `#header` scoped slots, which take priority over the column functions.
