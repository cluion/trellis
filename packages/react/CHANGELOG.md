# @trellisjs/react

## 3.4.0

### Minor Changes

- [`7bdba6a`](https://github.com/cluion/trellis/commit/7bdba6a8a12a91191c4f81625bfdc5ca019cd08f) Thanks [@cluion](https://github.com/cluion)! - Add column pinning plugin — pin columns to left/right with CSS sticky positioning

### Patch Changes

- Updated dependencies [[`7bdba6a`](https://github.com/cluion/trellis/commit/7bdba6a8a12a91191c4f81625bfdc5ca019cd08f)]:
  - @trellisjs/core@1.4.0

## 3.3.0

### Minor Changes

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

## 3.2.0

### Minor Changes

- [`484c381`](https://github.com/cluion/trellis/commit/484c381e67406bcd3180329009924fffb54e79de) Thanks [@cluion](https://github.com/cluion)! - Add `TableInfo` component for displaying pagination info. Fix page not auto-clamping after data deletion.

### Patch Changes

- Updated dependencies [[`484c381`](https://github.com/cluion/trellis/commit/484c381e67406bcd3180329009924fffb54e79de)]:
  - @trellisjs/core@1.2.1

## 3.1.0

### Minor Changes

- [`745cb8a`](https://github.com/cluion/trellis/commit/745cb8a4a3f7c370901e8a8a2c970120bf9686c9) Thanks [@cluion](https://github.com/cluion)! - Add `stickyHeader` prop to Table component: enables sticky table headers during vertical scrolling via CSS `position: sticky` on `<th>` elements.

## 3.0.0

### Patch Changes

- Updated dependencies [[`f36fb6e`](https://github.com/cluion/trellis/commit/f36fb6e6e959001eefe8f8428d5186e67c7574d6)]:
  - @trellisjs/core@1.1.0

## 2.0.0

### Patch Changes

- Updated dependencies [[`0c8fbb2`](https://github.com/cluion/trellis/commit/0c8fbb2d3328812c2084fa34ae477c801da5d06d)]:
  - @trellisjs/core@1.0.0

## 1.0.0

### Patch Changes

- Updated dependencies [[`46e9699`](https://github.com/cluion/trellis/commit/46e9699cc70daba5dc6e43349db2d2f1f197d026)]:
  - @trellisjs/core@0.1.0
