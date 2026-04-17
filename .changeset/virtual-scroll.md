---
"@trellisjs/plugin-virtual-scroll": major
"@trellisjs/core": minor
"@trellisjs/react": minor
---

Add virtual scroll plugin for large dataset rendering

- New package `@trellisjs/plugin-virtual-scroll` — DOM-based row virtualization
- Registers transform at priority=35 (after pagination) to slice visible rows
- Scroll event handling with requestAnimationFrame throttling
- Overscan buffer to prevent blank flashes during fast scrolling
- Core pipeline updated to correctly calculate `totalItems` when transforms exist after pagination
- `TableState` gains optional `virtualScroll?: VirtualScrollState` field
- React adapter adds `VirtualScrollBody` component and `useVirtualScroll` hook
- Spacer rows maintain correct scrollbar height for full dataset
