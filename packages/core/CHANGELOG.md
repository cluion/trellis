# @trellisjs/core

## 1.5.0

### Minor Changes

- [`f2927fb`](https://github.com/cluion/trellis/commit/f2927fba77d2242d0fca99859fc1e6db0d63d9d1) Thanks [@cluion](https://github.com/cluion)! - Add row expansion plugin — expand rows to show custom detail content with accordion and multi modes

## 1.4.0

### Minor Changes

- [`7bdba6a`](https://github.com/cluion/trellis/commit/7bdba6a8a12a91191c4f81625bfdc5ca019cd08f) Thanks [@cluion](https://github.com/cluion)! - Add column pinning plugin — pin columns to left/right with CSS sticky positioning

## 1.3.0

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

## 1.2.1

### Patch Changes

- [`484c381`](https://github.com/cluion/trellis/commit/484c381e67406bcd3180329009924fffb54e79de) Thanks [@cluion](https://github.com/cluion)! - Add `TableInfo` component for displaying pagination info. Fix page not auto-clamping after data deletion.

## 1.2.0

### Minor Changes

- [`bb74e13`](https://github.com/cluion/trellis/commit/bb74e1395d460df150b349442f3f506ab87d5eb2) Thanks [@cluion](https://github.com/cluion)! - Add `columnVisibility` to `TableState` and new `@trellisjs/plugin-column-visibility` plugin for dynamic column show/hide control via events (`column:toggle`, `column:show`, `column:hide`).

## 1.1.0

### Minor Changes

- [`f36fb6e`](https://github.com/cluion/trellis/commit/f36fb6e6e959001eefe8f8428d5186e67c7574d6) Thanks [@cluion](https://github.com/cluion)! - Add `addRow`, `removeRow`, `updateRow` methods to TrellisAPI for dynamic data manipulation. Each method modifies `sourceData` and re-runs the Transform Pipeline, so sort/filter/pagination update automatically. Emits `data:added`, `data:removed`, `data:updated` events respectively.

## 1.0.0

### Major Changes

- [`0c8fbb2`](https://github.com/cluion/trellis/commit/0c8fbb2d3328812c2084fa34ae477c801da5d06d) Thanks [@cluion](https://github.com/cluion)! - BREAKING: SortState 改為多欄排序結構 (sortBy: SortCriterion[])

  - `SortState.columnId` + `direction` 移除，改為 `SortState.sortBy: SortCriterion[]`
  - 新增 `SortCriterion` 介面：`{ columnId: string; direction: 'asc' | 'desc' }`
  - sort 插件支援 `append` 模式（Shift+Click 追加排序條件）
  - transform 邏輯依 sortBy 陣列逐一比較，第一個非零結果決定順序
  - plugin-datasource 的 `buildQueryFromState` 直接傳遞 sortBy 陣列

## 0.1.0

### Minor Changes

- [`46e9699`](https://github.com/cluion/trellis/commit/46e9699cc70daba5dc6e43349db2d2f1f197d026) Thanks [@cluion](https://github.com/cluion)! - 引入 Transform Pipeline 架構，修復 sort + filter 插件互動問題

  - Core 新增集中式 Transform Pipeline 引擎，持有唯一 sourceData
  - 插件透過 registerTransform 註冊純轉換函式，移除各自的 originalData 快照
  - 新增 registerTransform、recompute、updateSourceData 三個 API 方法
  - 管線依 priority 執行：filter(10) → sort(20) → pagination(30)
  - 修復：篩選後排序 → 清除排序保留篩選；排序後篩選 → 清除篩選保留排序
