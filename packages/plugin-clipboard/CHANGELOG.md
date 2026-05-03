# @trellisjs/plugin-clipboard

## 1.0.0

### Major Changes

- [`3508bf3`](https://github.com/cluion/trellis/commit/3508bf324c7d6c38158950bf9de9aaae4d69f5de) Thanks [@cluion](https://github.com/cluion)! - Add clipboard plugin and fix useTrellis Strict Mode bug

  - **@trellisjs/plugin-clipboard**: New plugin for copy/paste table data as TSV. Supports keyboard shortcuts (Ctrl/Cmd+C/V), programmatic triggers, selection plugin integration, and configurable headers/delimiter. Uses `clipboardData.setData()`/`getData()` for synchronous clipboard access.

  - **@trellisjs/react**: Fix `useTrellis` creating duplicate Trellis instances in React Strict Mode. Changed from `useState` (initializer called twice in Strict Mode) to `useRef` (stable across renders), preventing orphaned DOM listeners and duplicate event emissions.
