---
"@trellisjs/plugin-filter": minor
---

feat: add `debounceMs` option to filter plugin

- New `debounceMs` option delays `filter:change` and `filter:column` recompute
- Shared debounce timer: last event wins when both fire rapidly
- New `destroy()` method cancels pending timers
- Default `debounceMs: 0` preserves existing behavior (backward compatible)
