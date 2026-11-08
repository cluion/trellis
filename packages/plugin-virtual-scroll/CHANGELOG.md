# @trellisjs/plugin-virtual-scroll

## 1.0.1

### Patch Changes

- [#41](https://github.com/cluion/trellis/pull/41) [`347ec6d`](https://github.com/cluion/trellis/commit/347ec6d0f73fe2e1250ec42387c082e69d0482e3) Thanks [@cluion](https://github.com/cluion)! - Protect table-owned state containers and row metadata with copied immutable snapshots, including readonly Set operations, while preserving original row payload and framework render-value ownership. Cache explicitly declared transform dependencies during recomputeView(), keep legacy transforms uncached, and retain recompute() as a forced refresh.

    Filter/sort/pagination declare their dependencies and virtual scrolling reuses their results. Add a reproducible 10,000/50,000-row core CPU benchmark, including the cold-query cost of snapshot protection.

- [#41](https://github.com/cluion/trellis/pull/41) [`347ec6d`](https://github.com/cluion/trellis/commit/347ec6d0f73fe2e1250ec42387c082e69d0482e3) Thanks [@cluion](https://github.com/cluion)! - Prevent automatic row ID reuse and reject duplicate explicit IDs. Publish viewport metadata together with rows through TransformResult, and calculate virtual-scroll ranges from the current page, including remote pages, data shrinkage and query resets.

    Release the core and virtual-scroll changes together; the workspace peer range resolves to the updated core when packing. Backend helper safety changes remain pending a separate alpha-only release.

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
