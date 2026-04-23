---
"@trellisjs/plugin-export-csv": major
"@trellisjs/core": minor
---

Add CSV export plugin and `getFilteredData()` API

- New package `@trellisjs/plugin-export-csv` with browser download and CSV string callback
- Core adds `getFilteredData()` to return filtered+sorted data before pagination
- Supports custom delimiter, header toggle, column selection, and current-page-only export
- UTF-8 BOM prefix for Excel compatibility
