# @trellisjs/plugin-export-csv

CSV export plugin for Trellis data tables — browser download or get CSV string.

## Installation

```bash
npm install @trellisjs/plugin-export-csv
```

## Events

### Listens

| Event | Payload | Description |
|---|---|---|
| `export:csv` | `ExportCSVOptions` | Trigger browser download of CSV file |
| `export:csv-string` | `{ callback: (csv: string) => void, options?: ExportCSVOptions }` | Get CSV string via callback |

### ExportCSVOptions

| Option | Type | Default | Description |
|---|---|---|---|
| `filename` | `string` | `'export.csv'` | Download filename (only for `export:csv`) |
| `delimiter` | `string` | `','` | Column delimiter (use `'\t'` for TSV) |
| `includeHeader` | `boolean` | `true` | Include header row |
| `columns` | `string[]` | all visible columns | Export only specified column IDs |
| `currentPageOnly` | `boolean` | `false` | Export current page instead of all filtered data |

## Usage

### Browser Download

```ts
import { Trellis } from '@trellisjs/core';
import { createExportCSVPlugin } from '@trellisjs/plugin-export-csv';

const trellis = new Trellis({
  columns,
  data,
  plugins: [createExportCSVPlugin()],
});

// Download all filtered data as CSV
trellis.api.emit('export:csv', { filename: 'data.csv' });

// Download current page only
trellis.api.emit('export:csv', { filename: 'page.csv', currentPageOnly: true });
```

### Get CSV String

```ts
trellis.api.emit('export:csv-string', {
  callback: (csv) => {
    // Use csv string for API upload, etc.
    console.log(csv);
  },
  options: { includeHeader: false },
});
```

### Custom Delimiter (TSV)

```ts
trellis.api.emit('export:csv', {
  filename: 'data.tsv',
  delimiter: '\t',
});
```

### Select Columns

```ts
trellis.api.emit('export:csv', {
  columns: ['name', 'email'],
});
```

## Notes

- Files include UTF-8 BOM prefix for Excel compatibility
- `visible: false` columns are excluded by default; specify them in `columns` to include
- `currentPageOnly` uses `state.data` (paginated); otherwise uses `api.getFilteredData()` (filtered + sorted, pre-pagination)
- `downloadCSV` uses `Blob` + `URL.createObjectURL` — browser environment only

## License

MIT
