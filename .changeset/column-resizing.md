---
"@trellisjs/plugin-column-resizing": major
"@trellisjs/core": minor
"@trellisjs/react": minor
---

Add column resizing plugin and ResizeHandle component

- New package `@trellisjs/plugin-column-resizing` with drag-to-resize support
- Core adds `ColumnResizingState` type and `ColumnDef.resizable` field
- React adapter adds `ResizeHandle` component and `Th` integration
- Supports minWidth/maxWidth constraints and reset
- Events: resize:start, resize:column, resize:end, resize:reset
