# @trellisjs/core

## 1.11.0

### Minor Changes

- [#35](https://github.com/cluion/trellis/pull/35) [`8c6bd16`](https://github.com/cluion/trellis/commit/8c6bd16473584945eef5d784fafc7194b0856316) Thanks [@cluion](https://github.com/cluion)! - 修正釘選欄調整寬度後，後面的釘選欄位移沒有更新、兩欄重疊的問題。

    - core：`calculatePinOffsets()` 新增可選參數 `columnResizing`，有傳入時改用調整後的欄寬；啟用調整欄寬、但欄位沒有 `width` 時改用 `defaultWidth`。`getHeaderCellLayout()`、`getBodyCellLayout()` 會自動傳入，所以 React 與 Vue 的表格元件都已修正
    - plugin-column-pinning：`getPinOffsets(state)` 改用調整後的欄寬
    - react：`Table` 新增 `className` 與 `style` props，套用到外層元素；有釘選欄時把 `max-height` 設在這裡，固定表頭才會生效
    - 文件：補上固定表頭與釘選欄需要不透明背景、高度限制要設在表格元件上，以及釘選欄寬度的決定順序

## 1.10.0

### Minor Changes

- [#33](https://github.com/cluion/trellis/pull/33) [`22f81a3`](https://github.com/cluion/trellis/commit/22f81a329e651428cb430e1125b6e7f0796fb6a3) Thanks [@cluion](https://github.com/cluion)! - core 新增框架無關的儲存格輔助函式，React 與 Vue 適配器共用。

    - `getHeaderCellLayout()`：表頭儲存格的樣式與 class（欄寬、對齊、固定表頭、欄釘選、調整欄寬）
    - `getBodyCellLayout()`：資料儲存格的樣式與 class（對齊、欄釘選）
    - `getCellValue()`：依欄位 accessor 取出儲存格的值
    - 修正 react：同時啟用調整欄寬時，釘選欄的表頭與固定表頭不再失去 sticky 定位

## 1.9.0

### Minor Changes

- [#30](https://github.com/cluion/trellis/pull/30) [`37c1af7`](https://github.com/cluion/trellis/commit/37c1af746c7563d4a4b7d1ec64483c9b8b0188b3) Thanks [@cluion](https://github.com/cluion)! - 事件 payload 自動帶型別。

    - core 新增 `TrellisEventMap`：`api.on()` 的 handler 會收到該事件的 payload 型別，`api.emit()` 會檢查 payload，寫錯就編譯失敗
    - 各插件以 module augmentation 登記自己的事件，並匯出 payload 型別（如 `SortChangePayload`、`FilterChangePayload`、`PaginationGotoPayload`、`InlineEditKeydownPayload`），import 插件後即可使用
    - 沒有 payload 的指令（如 `pagination:next`、`state:save`）可省略第二個參數，既有的 `null`、`{}`、`undefined` 寫法照常可用
    - 未登記的事件維持原本行為，payload 為 `unknown`；自訂插件可用同樣方式登記事件
    - 執行期行為不變

## 1.8.1

### Patch Changes

- [#27](https://github.com/cluion/trellis/pull/27) [`1990b5d`](https://github.com/cluion/trellis/commit/1990b5d163b57d2488925b2f7321d6c066b7f6ac) Thanks [@cluion](https://github.com/cluion)! - 修正 Transform Pipeline 在沒有 pagination 插件時的結果，以及重複通知。

    - 沒有 pagination 插件時，`pagination.totalItems` 改為篩選後的筆數（原本是原始資料筆數），`TableInfo` 顯示的總數才會正確
    - priority >= 30 的切片 transform（如 virtualScroll）不再影響 `getFilteredData()`；原本沒有分頁時，CSV 匯出與剪貼簿只會拿到可視範圍的列
    - `recompute()` 只通知 subscriber 一次；原本會先收到資料尚未更新的中間狀態，多觸發一次 render

## 1.8.0

### Minor Changes

- [#24](https://github.com/cluion/trellis/pull/24) [`0e89a57`](https://github.com/cluion/trellis/commit/0e89a57d12d97a77f6919e5acbd3aa646209ad93) Thanks [@cluion](https://github.com/cluion)! - 修正 TypeScript 使用者照 README 寫法遇到的型別錯誤。

    - `TrellisOptions.plugins` 接受任意列型別的插件，`useTrellis<User>({ plugins: [createSortPlugin()] })` 不再出現 `TrellisPlugin<Record<string, unknown>>` 無法指派給 `TrellisPlugin<User>` 的錯誤
    - `Trellis`、`useTrellis`、`createStaticDatasource` 的型別約束由 `Record<string, unknown>` 放寬為 `object`，可以直接使用 `interface` 定義的資料型別
    - `TrellisContext` 接受任意列型別的 api，`<TrellisContext.Provider value={api}>` 可以傳入 `TrellisAPI<User>`
    - `TableInfo` 改為無條件讀取 context，符合 rules of hooks；有傳 `pagination` prop 時仍不需要 Provider

## 1.7.0

### Minor Changes

- [`3f467d9`](https://github.com/cluion/trellis/commit/3f467d90d12245eed4a66f4285d1be6abf8bd01c) Thanks [@cluion](https://github.com/cluion)! - Add column resizing plugin and ResizeHandle component

    - New package `@trellisjs/plugin-column-resizing` with drag-to-resize support
    - Core adds `ColumnResizingState` type and `ColumnDef.resizable` field
    - React adapter adds `ResizeHandle` component and `Th` integration
    - Supports minWidth/maxWidth constraints and reset
    - Events: resize:start, resize:column, resize:end, resize:reset

## 1.6.0

### Minor Changes

- [`b4f8a7e`](https://github.com/cluion/trellis/commit/b4f8a7ee4573f5c416e8c600e10c68a0ccb81bd6) Thanks [@cluion](https://github.com/cluion)! - Add CSV export plugin and `getFilteredData()` API

    - New package `@trellisjs/plugin-export-csv` with browser download and CSV string callback
    - Core adds `getFilteredData()` to return filtered+sorted data before pagination
    - Supports custom delimiter, header toggle, column selection, and current-page-only export
    - UTF-8 BOM prefix for Excel compatibility

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
