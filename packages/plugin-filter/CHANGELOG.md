# @trellisjs/plugin-filter

## 3.3.0

### Minor Changes

- [#30](https://github.com/cluion/trellis/pull/30) [`37c1af7`](https://github.com/cluion/trellis/commit/37c1af746c7563d4a4b7d1ec64483c9b8b0188b3) Thanks [@cluion](https://github.com/cluion)! - 事件 payload 自動帶型別。

    - core 新增 `TrellisEventMap`：`api.on()` 的 handler 會收到該事件的 payload 型別，`api.emit()` 會檢查 payload，寫錯就編譯失敗
    - 各插件以 module augmentation 登記自己的事件，並匯出 payload 型別（如 `SortChangePayload`、`FilterChangePayload`、`PaginationGotoPayload`、`InlineEditKeydownPayload`），import 插件後即可使用
    - 沒有 payload 的指令（如 `pagination:next`、`state:save`）可省略第二個參數，既有的 `null`、`{}`、`undefined` 寫法照常可用
    - 未登記的事件維持原本行為，payload 為 `unknown`；自訂插件可用同樣方式登記事件
    - 執行期行為不變

## 3.2.0

### Minor Changes

- [`1933f11`](https://github.com/cluion/trellis/commit/1933f116ba777cb4c0647ab98e69a7d676c423a1) Thanks [@cluion](https://github.com/cluion)! - Add independent debounce options for search and column filters

    - New `searchDebounceMs` option — debounce delay for `filter:change` events only
    - New `columnDebounceMs` option — debounce delay for `filter:column` events only
    - `debounceMs` remains as shorthand that sets both; specific options take priority
    - Each event type now has its own independent debounce timer

## 3.1.0

### Minor Changes

- [`2c89bf5`](https://github.com/cluion/trellis/commit/2c89bf569327813a72962647881a1d1fca316d55) Thanks [@cluion](https://github.com/cluion)! - feat: add `debounceMs` option to filter plugin

    - New `debounceMs` option delays `filter:change` and `filter:column` recompute
    - Shared debounce timer: last event wins when both fire rapidly
    - New `destroy()` method cancels pending timers
    - Default `debounceMs: 0` preserves existing behavior (backward compatible)

## 3.0.0

### Patch Changes

- Updated dependencies [[`f36fb6e`](https://github.com/cluion/trellis/commit/f36fb6e6e959001eefe8f8428d5186e67c7574d6)]:
    - @trellisjs/core@1.1.0

## 2.1.0

### Minor Changes

- [`4290d58`](https://github.com/cluion/trellis/commit/4290d58860bf5046ec44a201d1e14c363723f18e) Thanks [@cluion](https://github.com/cluion)! - 新增單欄篩選功能（`filter:column` 事件）

    - 新增 `filter:column` 事件：`{ columnId: string, value: string }` 設定/清除個別欄位篩選
    - 全域搜尋與單欄篩選為 AND 關係
    - 完全向後相容 — 不使用 `filter:column` 則行為不變

## 2.0.0

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
