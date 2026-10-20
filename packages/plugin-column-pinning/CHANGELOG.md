# @trellisjs/plugin-column-pinning

## 1.1.1

### Patch Changes

- [#35](https://github.com/cluion/trellis/pull/35) [`8c6bd16`](https://github.com/cluion/trellis/commit/8c6bd16473584945eef5d784fafc7194b0856316) Thanks [@cluion](https://github.com/cluion)! - 修正釘選欄調整寬度後，後面的釘選欄位移沒有更新、兩欄重疊的問題。

    - core：`calculatePinOffsets()` 新增可選參數 `columnResizing`，有傳入時改用調整後的欄寬；啟用調整欄寬、但欄位沒有 `width` 時改用 `defaultWidth`。`getHeaderCellLayout()`、`getBodyCellLayout()` 會自動傳入，所以 React 與 Vue 的表格元件都已修正
    - plugin-column-pinning：`getPinOffsets(state)` 改用調整後的欄寬
    - react：`Table` 新增 `className` 與 `style` props，套用到外層元素；有釘選欄時把 `max-height` 設在這裡，固定表頭才會生效
    - 文件：補上固定表頭與釘選欄需要不透明背景、高度限制要設在表格元件上，以及釘選欄寬度的決定順序

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

- [`7bdba6a`](https://github.com/cluion/trellis/commit/7bdba6a8a12a91191c4f81625bfdc5ca019cd08f) Thanks [@cluion](https://github.com/cluion)! - Add column pinning plugin — pin columns to left/right with CSS sticky positioning

### Patch Changes

- Updated dependencies [[`7bdba6a`](https://github.com/cluion/trellis/commit/7bdba6a8a12a91191c4f81625bfdc5ca019cd08f)]:
    - @trellisjs/core@1.4.0
