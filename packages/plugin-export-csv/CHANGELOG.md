# @trellisjs/plugin-export-csv

## 1.1.0

### Minor Changes

- [#30](https://github.com/cluion/trellis/pull/30) [`37c1af7`](https://github.com/cluion/trellis/commit/37c1af746c7563d4a4b7d1ec64483c9b8b0188b3) Thanks [@cluion](https://github.com/cluion)! - 事件 payload 自動帶型別。

    - core 新增 `TrellisEventMap`：`api.on()` 的 handler 會收到該事件的 payload 型別，`api.emit()` 會檢查 payload，寫錯就編譯失敗
    - 各插件以 module augmentation 登記自己的事件，並匯出 payload 型別（如 `SortChangePayload`、`FilterChangePayload`、`PaginationGotoPayload`、`InlineEditKeydownPayload`），import 插件後即可使用
    - 沒有 payload 的指令（如 `pagination:next`、`state:save`）可省略第二個參數，既有的 `null`、`{}`、`undefined` 寫法照常可用
    - 未登記的事件維持原本行為，payload 為 `unknown`；自訂插件可用同樣方式登記事件
    - 執行期行為不變

## 1.0.0

### Major Changes

- [`b4f8a7e`](https://github.com/cluion/trellis/commit/b4f8a7ee4573f5c416e8c600e10c68a0ccb81bd6) Thanks [@cluion](https://github.com/cluion)! - Add CSV export plugin and `getFilteredData()` API

    - New package `@trellisjs/plugin-export-csv` with browser download and CSV string callback
    - Core adds `getFilteredData()` to return filtered+sorted data before pagination
    - Supports custom delimiter, header toggle, column selection, and current-page-only export
    - UTF-8 BOM prefix for Excel compatibility

### Patch Changes

- Updated dependencies [[`b4f8a7e`](https://github.com/cluion/trellis/commit/b4f8a7ee4573f5c416e8c600e10c68a0ccb81bd6)]:
    - @trellisjs/core@1.6.0
