# @trellisjs/plugin-sort

Column sorting plugin for Trellis data tables with automatic type detection.

## Installation

```bash
npm install @trellisjs/plugin-sort
```

## Events

### Listens

| Event | Payload | Description |
|---|---|---|
| `sort:change` | `{ columnId: string; direction: 'asc' \| 'desc' \| null }` | Sort by a column. Set `direction` to `null` to clear sorting and restore original row order. |

### State Updated

After handling `sort:change`, the plugin updates:

- `state.sorting` -- set to `{ columnId, direction }`, or `{ columnId: '', direction: null }` when cleared.
- `state.data` -- rows reordered according to the sort direction.

## Usage

```ts
import { createTrellis } from '@trellisjs/core';
import { createSortPlugin } from '@trellisjs/plugin-sort';

const api = createTrellis({
  columns: [
    { id: 'name', accessor: 'name' },
    { id: 'age', accessor: 'age', sortFn: (a, b) => (a as number) - (b as number) },
    { id: 'note', accessor: 'note', sortable: false },
  ],
  data: [
    { name: 'Alice', age: 30, note: '-' },
    { name: 'Bob', age: 25, note: '-' },
  ],
  plugins: [createSortPlugin()],
});

// Sort ascending by age
api.emit('sort:change', { columnId: 'age', direction: 'asc' });

// Sort descending by name
api.emit('sort:change', { columnId: 'name', direction: 'desc' });

// Clear sorting (restores original row order)
api.emit('sort:change', { columnId: 'name', direction: null });
```

### Custom Sort Function

Provide a `sortFn` on the column definition to override the built-in comparator:

```ts
{ id: 'date', accessor: 'date', sortFn: (a, b) => new Date(a).getTime() - new Date(b).getTime() }
```

Columns with `sortable: false` are ignored when a sort is requested on them.

### Built-in Type Detection

Without a custom `sortFn`, the plugin auto-detects value types and compares them accordingly:

- **Numbers** -- numeric comparison.
- **Strings** -- `localeCompare`, with ISO date string detection.
- **Other** -- coerced to string and compared via `localeCompare`.

## License

MIT
