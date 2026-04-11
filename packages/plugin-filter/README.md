# @trellisjs/plugin-filter

Global search filter plugin for Trellis data tables.

## Installation

```bash
npm install @trellisjs/plugin-filter
```

## Events

### Listens

| Event | Payload | Description |
|---|---|---|
| `filter:change` | `{ query: string }` | Filter rows across all columns. An empty string clears the filter and restores the original dataset. |

### State Updated

After handling `filter:change`, the plugin updates:

- `state.filtering.query` -- the current search keyword.
- `state.data` -- rows matching the filter, or the full dataset when cleared.

## Usage

```ts
import { createTrellis } from '@trellisjs/core';
import { createFilterPlugin } from '@trellisjs/plugin-filter';

const api = createTrellis({
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
api.emit('filter:change', { query: 'alice' });

// Clear the filter (restores all rows)
api.emit('filter:change', { query: '' });
```

### How It Works

The plugin stores a snapshot of the original data on install. On each `filter:change` event it performs a case-insensitive substring match across every column value. Columns that use a function accessor are also supported -- the function is called to resolve each cell value before comparison.

### Combination with Other Plugins

For best results, install the filter plugin before the pagination plugin so that pagination operates on the filtered dataset:

```ts
plugins: [createFilterPlugin(), createPaginationPlugin()]
```

## License

MIT
