# @trellisjs/plugin-clipboard

Clipboard plugin for Trellis — copy/paste table data as TSV, integrating with Excel and Google Sheets.

## Install

```bash
pnpm add @trellisjs/plugin-clipboard
```

## Usage

```ts
import { createTrellis } from '@trellisjs/core';
import { createClipboardPlugin } from '@trellisjs/plugin-clipboard';

const trellis = createTrellis({
  data,
  columns,
  plugins: [
    createClipboardPlugin(),
  ],
});
```

### With Selection Plugin

When used together with `@trellisjs/plugin-selection`, only selected rows are copied. If no rows are selected, all data is copied.

```ts
import { createSelectionPlugin } from '@trellisjs/plugin-selection';
import { createClipboardPlugin } from '@trellisjs/plugin-clipboard';

const trellis = createTrellis({
  data,
  columns,
  plugins: [
    createSelectionPlugin(),
    createClipboardPlugin(),
  ],
});
```

## Options

```ts
interface ClipboardPluginOptions {
  copyHeaders?: boolean;        // Include header row in copy (default: true)
  delimiter?: '\t' | ',';       // Field delimiter (default: '\t')
  headerAccessor?: (col: ColumnDef) => string;  // Custom header text
}
```

## Events

### Emitted by the plugin

| Event | Payload | Description |
|-------|---------|-------------|
| `clipboard:copied` | `{ rows: DataRow[], text: string }` | Fired after data is written to clipboard |
| `clipboard:paste` | `{ rows: Record<string, string>[], raw: string }` | Fired when TSV text is parsed from clipboard |
| `clipboard:error` | `{ action: 'copy' \| 'paste', error: Error }` | Fired on clipboard API failure |

### Consumed by the plugin

| Event | Description |
|-------|-------------|
| `clipboard:copy` | Trigger copy (no payload) |
| `clipboard:paste` | Trigger paste (no payload) |

## Keyboard Shortcuts

- **Ctrl/Cmd + C** — Copy selected rows (or all data) to clipboard
- **Ctrl/Cmd + V** — Paste TSV text from clipboard

## TSV Format

Copied text uses tab (`\t`) separated fields and newline (`\n`) separated rows, compatible with Excel and Google Sheets paste.

Paste parsing maps fields to columns by order and supports automatic header detection (case-insensitive match with `column.header`).

## Requirements

- Browser with `navigator.clipboard` API (requires HTTPS or localhost)
