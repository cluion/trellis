# @trellisjs/plugin-export-csv

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
