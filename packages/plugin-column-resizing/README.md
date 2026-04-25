# @trellisjs/plugin-column-resizing

Column resizing plugin for Trellis data tables — drag to resize, with min/max width constraints.

## Installation

```bash
npm install @trellisjs/plugin-column-resizing
```

## Usage

```typescript
import { Trellis } from '@trellisjs/core';
import { createColumnResizingPlugin } from '@trellisjs/plugin-column-resizing';

const trellis = new Trellis({
  columns,
  data,
  plugins: [
    createColumnResizingPlugin({
      minWidth: 40,
      maxWidth: 600,
      defaultWidth: 150,
    }),
  ],
});
```

### React Integration

The React adapter provides a `ResizeHandle` component that handles mouse drag events:

```tsx
import { Th, ResizeHandle } from '@trellisjs/react';

// Th automatically renders ResizeHandle when columnResizing plugin is active
// and column.resizable !== false
<Th column={column} />
```

To disable resizing on a specific column:

```typescript
const columns = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'actions', accessor: 'id', header: 'Actions', resizable: false },
];
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minWidth` | `number` | `50` | Minimum column width (px) |
| `maxWidth` | `number` | `undefined` | Maximum column width (px) |
| `defaultWidth` | `number` | `150` | Default width for columns without explicit width |

## Events

### Listens

| Event | Payload | Description |
|-------|---------|-------------|
| `resize:start` | `{ columnId: string }` | Start resizing a column |
| `resize:column` | `{ columnId: string, width: number }` | Update column width |
| `resize:end` | — | End resizing |
| `resize:reset` | — | Reset all column widths to default |

## State

The plugin adds `columnResizing` to `TableState`:

```typescript
interface ColumnResizingState {
  columnWidths: Record<string, number>;  // columnId → width in px
  resizingColumn: string | null;         // currently resizing column
  minWidth: number;
  defaultWidth: number;
  maxWidth?: number;
}
```

## License

MIT
