# @trellisjs/plugin-virtual-scroll

## 1.0.0

### Major Changes

- [`cdfd747`](https://github.com/cluion/trellis/commit/cdfd74740151369ae7d585b2ae2d9d1e28364e81) Thanks [@cluion](https://github.com/cluion)! - Add virtual scroll plugin for large dataset rendering

  - New package `@trellisjs/plugin-virtual-scroll` — DOM-based row virtualization
  - Registers transform at priority=35 (after pagination) to slice visible rows
  - Scroll event handling with requestAnimationFrame throttling
  - Overscan buffer to prevent blank flashes during fast scrolling
  - Core pipeline updated to correctly calculate `totalItems` when transforms exist after pagination
  - `TableState` gains optional `virtualScroll?: VirtualScrollState` field
  - React adapter adds `VirtualScrollBody` component and `useVirtualScroll` hook
  - Spacer rows maintain correct scrollbar height for full dataset

### Patch Changes

- Updated dependencies [[`cdfd747`](https://github.com/cluion/trellis/commit/cdfd74740151369ae7d585b2ae2d9d1e28364e81)]:
  - @trellisjs/core@1.3.0
