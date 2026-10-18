# @trellisjs/plugin-datasource

## 3.1.0

### Minor Changes

- [#24](https://github.com/cluion/trellis/pull/24) [`0e89a57`](https://github.com/cluion/trellis/commit/0e89a57d12d97a77f6919e5acbd3aa646209ad93) Thanks [@cluion](https://github.com/cluion)! - 修正 TypeScript 使用者照 README 寫法遇到的型別錯誤。

    - `TrellisOptions.plugins` 接受任意列型別的插件，`useTrellis<User>({ plugins: [createSortPlugin()] })` 不再出現 `TrellisPlugin<Record<string, unknown>>` 無法指派給 `TrellisPlugin<User>` 的錯誤
    - `Trellis`、`useTrellis`、`createStaticDatasource` 的型別約束由 `Record<string, unknown>` 放寬為 `object`，可以直接使用 `interface` 定義的資料型別
    - `TrellisContext` 接受任意列型別的 api，`<TrellisContext.Provider value={api}>` 可以傳入 `TrellisAPI<User>`
    - `TableInfo` 改為無條件讀取 context，符合 rules of hooks；有傳 `pagination` prop 時仍不需要 Provider

## 3.0.0

### Patch Changes

- Updated dependencies [[`f36fb6e`](https://github.com/cluion/trellis/commit/f36fb6e6e959001eefe8f8428d5186e67c7574d6)]:
    - @trellisjs/core@1.1.0

## 2.0.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [[`46e9699`](https://github.com/cluion/trellis/commit/46e9699cc70daba5dc6e43349db2d2f1f197d026)]:
    - @trellisjs/core@0.1.0
