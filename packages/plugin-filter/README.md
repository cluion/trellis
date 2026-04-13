# @trellisjs/plugin-filter

Filter plugin for Trellis data tables — supports global search and per-column filtering.

## Installation

```bash
npm install @trellisjs/plugin-filter
```

## Events

### Listens

| Event | Payload | Description |
|---|---|---|
| `filter:change` | `{ query: string }` | Filter rows across all columns. An empty string clears the global filter. |
| `filter:column` | `{ columnId: string, value: string }` | Filter rows by a specific column. An empty string clears that column's filter. |

### State Updated

- `state.filtering.query` — the current global search keyword.
- `state.filtering.columnFilters` — a `Record<string, string>` of per-column filter values.
- `state.data` — rows matching all active filters, or the full dataset when all are cleared.

Global search and per-column filters are **AND** relationship: a row must match all conditions to appear.

## Usage

### Global Search

```ts
import { Trellis } from '@trellisjs/core';
import { createFilterPlugin } from '@trellisjs/plugin-filter';

const trellis = new Trellis({
  columns: [
    { id: 'name', accessor: 'name' },
    { id: 'email', accessor: 'email' },
  ],
  data: [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
  ],
  plugins: [createFilterPlugin()],
});

// Filter rows where any column contains "alice"
trellis.api.emit('filter:change', { query: 'alice' });

// Clear the global filter
trellis.api.emit('filter:change', { query: '' });
```

### Per-Column Filter

```ts
// Filter rows where the "city" column contains "Taipei"
trellis.api.emit('filter:column', { columnId: 'city', value: 'Taipei' });

// Clear the "city" column filter
trellis.api.emit('filter:column', { columnId: 'city', value: '' });
```

The matching is case-insensitive substring match — same behavior as global search.

### Per-Column Filter with React

The plugin only provides the filtering logic. The UI is up to you:

```tsx
function MyTable({ data }) {
  const { api } = useTrellis({
    data,
    columns,
    plugins: [createFilterPlugin()],
  });

  const handleColumnFilter = (columnId: string, value: string) => {
    api.emit('filter:column', { columnId, value });
  };

  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.id}>
              {col.header}
              <input
                placeholder={`Filter ${col.header}`}
                onChange={(e) => handleColumnFilter(col.id, e.target.value)}
              />
            </th>
          ))}
        </tr>
      </thead>
      {/* ... */}
    </table>
  );
}
```

### Combination with Other Plugins

For best results, install the filter plugin before the pagination plugin so that pagination operates on the filtered dataset:

```ts
plugins: [createFilterPlugin(), createPaginationPlugin()]
```

## License

MIT
