# @trellisjs/plugin-sort

## 3.0.0

### Patch Changes

- Updated dependencies [[`f36fb6e`](https://github.com/cluion/trellis/commit/f36fb6e6e959001eefe8f8428d5186e67c7574d6)]:
  - @trellisjs/core@1.1.0

## 2.0.0

### Major Changes

- [`0c8fbb2`](https://github.com/cluion/trellis/commit/0c8fbb2d3328812c2084fa34ae477c801da5d06d) Thanks [@cluion](https://github.com/cluion)! - BREAKING: SortState 改為多欄排序結構 (sortBy: SortCriterion[])

  - `SortState.columnId` + `direction` 移除，改為 `SortState.sortBy: SortCriterion[]`
  - 新增 `SortCriterion` 介面：`{ columnId: string; direction: 'asc' | 'desc' }`
  - sort 插件支援 `append` 模式（Shift+Click 追加排序條件）
  - transform 邏輯依 sortBy 陣列逐一比較，第一個非零結果決定順序
  - plugin-datasource 的 `buildQueryFromState` 直接傳遞 sortBy 陣列

### Patch Changes

- Updated dependencies [[`0c8fbb2`](https://github.com/cluion/trellis/commit/0c8fbb2d3328812c2084fa34ae477c801da5d06d)]:
  - @trellisjs/core@1.0.0

## 1.0.0

### Minor Changes

- [`46e9699`](https://github.com/cluion/trellis/commit/46e9699cc70daba5dc6e43349db2d2f1f197d026) Thanks [@cluion](https://github.com/cluion)! - 引入 Transform Pipeline 架構，修復 sort + filter 插件互動問題

  - Core 新增集中式 Transform Pipeline 引擎，持有唯一 sourceData
  - 插件透過 registerTransform 註冊純轉換函式，移除各自的 originalData 快照
  - 新增 registerTransform、recompute、updateSourceData 三個 API 方法
  - 管線依 priority 執行：filter(10) → sort(20) → pagination(30)
  - 修復：篩選後排序 → 清除排序保留篩選；排序後篩選 → 清除篩選保留排序

### Patch Changes

- Updated dependencies [[`46e9699`](https://github.com/cluion/trellis/commit/46e9699cc70daba5dc6e43349db2d2f1f197d026)]:
  - @trellisjs/core@0.1.0
