# @trellisjs/plugin-filter

Filter plugin for Trellis data tables — supports global search and per-column filtering.

## Installation

```bash
npm install @trellisjs/plugin-filter
```

## Events

Payloads are typed through `TrellisEventMap`: once the plugin is imported, `api.on()` and `api.emit()` infer them. Exported payload types: `FilterChangePayload`, `FilterColumnPayload`.

### Listens

| Event | Payload | Description |
|---|---|---|
| `filter:change` | `{ query: string }` | Filter rows across all columns. An empty string clears the global filter. |
| `filter:column` | `{ columnId: string, value: string }` | Filter rows by a specific column. An empty string clears that column's filter. |

### State Updated

- `state.filtering.query` — the current global search keyword.
- `state.filtering.columnFilters` — a `Record<string, unknown>` of per-column filter values; the `filter:column` event accepts string values.
- In client mode, `state.data` contains rows matching all active filters, subject to pagination and other pipeline transforms.

Global search and per-column filters are **AND** relationship: a row must match all conditions to appear.

### Server-Side Mode

With `createDatasourcePlugin()` installed, this plugin only updates `state.filtering`. It does not filter the loaded page; the datasource sends `filter.global` and `filter.columns` to the backend. A changed filter resets the page to 1 and schedules a request after the configured debounce. Matching rules in this mode are determined by your backend. See the [server-side guide and Vue example](../../examples/vue-server-side/README.md).

## Usage

### Debounced Filtering

Pass `debounceMs` to delay recompute until the user stops typing:

```ts
import { createFilterPlugin } from '@trellisjs/plugin-filter';

// Wait 300ms after the last keystroke before filtering
createFilterPlugin({ debounceMs: 300 })

// Default: no debounce — every keystroke triggers immediate recompute
createFilterPlugin()
```

`debounceMs` sets the default delay for two independent timers: one for `filter:change`, one for `filter:column`. Repeated events reset their own timer; search and column-filter events do not cancel one another.

`trellis.destroy()` cancels pending filter timers. Vue and React adapters destroy their owned instance on unmount, so no separate plugin cleanup is needed.

### Independent Debounce

For different debounce delays on global search vs per-column filters, use `searchDebounceMs` and `columnDebounceMs`:

```ts
createFilterPlugin({
  searchDebounceMs: 300,  // filter:change debounced by 300ms
  columnDebounceMs: 100,  // filter:column debounced by 100ms
})
```

Each event type has its own independent timer — they don't interfere with each other.

**Priority:** specific options override `debounceMs`:

```ts
// search uses 500ms (specific), column uses 300ms (from debounceMs)
createFilterPlugin({ debounceMs: 300, searchDebounceMs: 500 })

// search immediate (0 overrides), column 100ms
createFilterPlugin({ debounceMs: 300, searchDebounceMs: 0, columnDebounceMs: 100 })
```

### Global Search

```ts
import { Trellis } from '@trellisjs/core';
import { createFilterPlugin } from '@trellisjs/plugin-filter';

const trellis = new Trellis({
  columns: [
    { id: 'name', accessor: 'name', header: 'Name' },
    { id: 'email', accessor: 'email', header: 'Email' },
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

Pipeline priorities place client-side filtering (`10`) before pagination (`30`), regardless of plugin installation order. A typical configuration is:

```ts
plugins: [createFilterPlugin(), createPaginationPlugin()]
```

## License

MIT
