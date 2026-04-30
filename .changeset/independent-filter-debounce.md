---
"@trellisjs/plugin-filter": minor
---

Add independent debounce options for search and column filters

- New `searchDebounceMs` option — debounce delay for `filter:change` events only
- New `columnDebounceMs` option — debounce delay for `filter:column` events only
- `debounceMs` remains as shorthand that sets both; specific options take priority
- Each event type now has its own independent debounce timer
