---
"@trellisjs/plugin-clipboard": major
"@trellisjs/react": patch
---

Add clipboard plugin and fix useTrellis Strict Mode bug

- **@trellisjs/plugin-clipboard**: New plugin for copy/paste table data as TSV. Supports keyboard shortcuts (Ctrl/Cmd+C/V), programmatic triggers, selection plugin integration, and configurable headers/delimiter. Uses `clipboardData.setData()`/`getData()` for synchronous clipboard access.

- **@trellisjs/react**: Fix `useTrellis` creating duplicate Trellis instances in React Strict Mode. Changed from `useState` (initializer called twice in Strict Mode) to `useRef` (stable across renders), preventing orphaned DOM listeners and duplicate event emissions.
