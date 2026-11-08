# @trellisjs/plugin-sort

Column sorting plugin for Trellis data tables with automatic type detection.

## Installation

```bash
npm install @trellisjs/plugin-sort
```

## Events

Payloads are typed through `TrellisEventMap`: once the plugin is imported, `api.on()` and `api.emit()` infer them. Exported payload types: `SortChangePayload`.

### Listens

| Event | Payload | Description |
|---|---|---|
| `sort:change` | `{ columnId: string; direction: 'asc' \| 'desc' \| null; append?: boolean }` | Replace sorting by default; `append: true` adds a secondary criterion. `direction: null` clears all criteria, or only the named criterion when appending. |

### State Updated

After handling `sort:change`, the plugin updates:

- `state.sorting.sortBy` -- an ordered array of `{ columnId, direction }` criteria. The first criterion is the primary sort; clearing all sorting produces `[]`.
- In client mode, `state.data` is reordered according to those criteria, subject to pagination and other transforms.

### Server-Side Mode

With `createDatasourcePlugin()` installed, sorting only updates query state. A changed sort resets the page to 1 and requests backend-sorted results. The loaded page is never sorted again locally, and column `sortFn` functions do not run in this mode. Map column IDs and implement comparators on the backend as needed. See the [server-side guide](../../examples/vue-server-side/README.md).

## Usage

```ts
import { Trellis } from '@trellisjs/core';
import { createSortPlugin } from '@trellisjs/plugin-sort';

const trellis = new Trellis({
  columns: [
    { id: 'name', accessor: 'name', header: 'Name' },
    { id: 'age', accessor: 'age', header: 'Age', sortFn: (a, b) => (a as number) - (b as number) },
    { id: 'note', accessor: 'note', header: 'Note', sortable: false },
  ],
  data: [
    { name: 'Alice', age: 30, note: '-' },
    { name: 'Bob', age: 25, note: '-' },
  ],
  plugins: [createSortPlugin()],
});
const { api } = trellis;

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
{ id: 'date', accessor: 'date', header: 'Date', sortFn: (a, b) => new Date(String(a)).getTime() - new Date(String(b)).getTime() }
```

Columns with `sortable: false` are ignored when a sort is requested on them.

### Built-in Type Detection

Without a custom `sortFn`, the plugin auto-detects value types and compares them accordingly:

- **Numbers** -- numeric comparison.
- **Strings** -- `localeCompare`, with ISO date string detection.
- **Other** -- coerced to string and compared via `localeCompare`.

## License

MIT
