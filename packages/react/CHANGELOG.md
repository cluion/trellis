# @trellisjs/react

## 3.8.0

### Minor Changes

- [#35](https://github.com/cluion/trellis/pull/35) [`8c6bd16`](https://github.com/cluion/trellis/commit/8c6bd16473584945eef5d784fafc7194b0856316) Thanks [@cluion](https://github.com/cluion)! - 修正釘選欄調整寬度後，後面的釘選欄位移沒有更新、兩欄重疊的問題。

    - core：`calculatePinOffsets()` 新增可選參數 `columnResizing`，有傳入時改用調整後的欄寬；啟用調整欄寬、但欄位沒有 `width` 時改用 `defaultWidth`。`getHeaderCellLayout()`、`getBodyCellLayout()` 會自動傳入，所以 React 與 Vue 的表格元件都已修正
    - plugin-column-pinning：`getPinOffsets(state)` 改用調整後的欄寬
    - react：`Table` 新增 `className` 與 `style` props，套用到外層元素；有釘選欄時把 `max-height` 設在這裡，固定表頭才會生效
    - 文件：補上固定表頭與釘選欄需要不透明背景、高度限制要設在表格元件上，以及釘選欄寬度的決定順序

## 3.7.1

### Patch Changes

- [#33](https://github.com/cluion/trellis/pull/33) [`22f81a3`](https://github.com/cluion/trellis/commit/22f81a329e651428cb430e1125b6e7f0796fb6a3) Thanks [@cluion](https://github.com/cluion)! - core 新增框架無關的儲存格輔助函式，React 與 Vue 適配器共用。

    - `getHeaderCellLayout()`：表頭儲存格的樣式與 class（欄寬、對齊、固定表頭、欄釘選、調整欄寬）
    - `getBodyCellLayout()`：資料儲存格的樣式與 class（對齊、欄釘選）
    - `getCellValue()`：依欄位 accessor 取出儲存格的值
    - 修正 react：同時啟用調整欄寬時，釘選欄的表頭與固定表頭不再失去 sticky 定位

## 3.7.0

### Minor Changes

- [#24](https://github.com/cluion/trellis/pull/24) [`0e89a57`](https://github.com/cluion/trellis/commit/0e89a57d12d97a77f6919e5acbd3aa646209ad93) Thanks [@cluion](https://github.com/cluion)! - 修正 TypeScript 使用者照 README 寫法遇到的型別錯誤。

    - `TrellisOptions.plugins` 接受任意列型別的插件，`useTrellis<User>({ plugins: [createSortPlugin()] })` 不再出現 `TrellisPlugin<Record<string, unknown>>` 無法指派給 `TrellisPlugin<User>` 的錯誤
    - `Trellis`、`useTrellis`、`createStaticDatasource` 的型別約束由 `Record<string, unknown>` 放寬為 `object`，可以直接使用 `interface` 定義的資料型別
    - `TrellisContext` 接受任意列型別的 api，`<TrellisContext.Provider value={api}>` 可以傳入 `TrellisAPI<User>`
    - `TableInfo` 改為無條件讀取 context，符合 rules of hooks；有傳 `pagination` prop 時仍不需要 Provider

## 3.6.1

### Patch Changes

- [`3508bf3`](https://github.com/cluion/trellis/commit/3508bf324c7d6c38158950bf9de9aaae4d69f5de) Thanks [@cluion](https://github.com/cluion)! - Add clipboard plugin and fix useTrellis Strict Mode bug

    - **@trellisjs/plugin-clipboard**: New plugin for copy/paste table data as TSV. Supports keyboard shortcuts (Ctrl/Cmd+C/V), programmatic triggers, selection plugin integration, and configurable headers/delimiter. Uses `clipboardData.setData()`/`getData()` for synchronous clipboard access.

    - **@trellisjs/react**: Fix `useTrellis` creating duplicate Trellis instances in React Strict Mode. Changed from `useState` (initializer called twice in Strict Mode) to `useRef` (stable across renders), preventing orphaned DOM listeners and duplicate event emissions.

## 3.6.0

### Minor Changes

- [`3f467d9`](https://github.com/cluion/trellis/commit/3f467d90d12245eed4a66f4285d1be6abf8bd01c) Thanks [@cluion](https://github.com/cluion)! - Add column resizing plugin and ResizeHandle component

    - New package `@trellisjs/plugin-column-resizing` with drag-to-resize support
    - Core adds `ColumnResizingState` type and `ColumnDef.resizable` field
    - React adapter adds `ResizeHandle` component and `Th` integration
    - Supports minWidth/maxWidth constraints and reset
    - Events: resize:start, resize:column, resize:end, resize:reset

### Patch Changes

- Updated dependencies [[`3f467d9`](https://github.com/cluion/trellis/commit/3f467d90d12245eed4a66f4285d1be6abf8bd01c)]:
    - @trellisjs/core@1.7.0

## 3.5.0

### Minor Changes

- [`f2927fb`](https://github.com/cluion/trellis/commit/f2927fba77d2242d0fca99859fc1e6db0d63d9d1) Thanks [@cluion](https://github.com/cluion)! - Add row expansion plugin — expand rows to show custom detail content with accordion and multi modes

### Patch Changes

- Updated dependencies [[`f2927fb`](https://github.com/cluion/trellis/commit/f2927fba77d2242d0fca99859fc1e6db0d63d9d1)]:
    - @trellisjs/core@1.5.0

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
