# @trellisjs/plugin-column-resizing

## 1.0.0

### Major Changes

- [`3f467d9`](https://github.com/cluion/trellis/commit/3f467d90d12245eed4a66f4285d1be6abf8bd01c) Thanks [@cluion](https://github.com/cluion)! - Add column resizing plugin and ResizeHandle component

  - New package `@trellisjs/plugin-column-resizing` with drag-to-resize support
  - Core adds `ColumnResizingState` type and `ColumnDef.resizable` field
  - React adapter adds `ResizeHandle` component and `Th` integration
  - Supports minWidth/maxWidth constraints and reset
  - Events: resize:start, resize:column, resize:end, resize:reset

### Patch Changes

- Updated dependencies [[`3f467d9`](https://github.com/cluion/trellis/commit/3f467d90d12245eed4a66f4285d1be6abf8bd01c)]:
  - @trellisjs/core@1.7.0
