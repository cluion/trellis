# @trellisjs/plugin-pagination

Page navigation plugin for Trellis data tables with configurable page size.

## Installation

```bash
npm install @trellisjs/plugin-pagination
```

## Events

### Listens

| Event | Payload | Description |
|---|---|---|
| `pagination:goto` | `{ page: number }` | Jump to a specific page. Clamped to the valid range `[1, totalPages]`. |
| `pagination:prev` | _(none)_ | Go to the previous page. No-op when already on page 1. |
| `pagination:next` | _(none)_ | Go to the next page. No-op when already on the last page. |
| `pagination:pageSize` | `{ pageSize: number }` | Change the number of rows per page. Resets to page 1. |

### State Updated

The plugin writes the following on every navigation:

- `state.pagination` -- `{ page, pageSize, totalItems }`.
- `state.data` -- the sliced rows for the current page.

## Usage

```ts
import { createTrellis } from '@trellisjs/core';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';

const api = createTrellis({
  columns: [{ id: 'name', accessor: 'name' }],
  data: [/* ... 100 rows ... */],
  plugins: [createPaginationPlugin()],
});

// Go to page 3
api.emit('pagination:goto', { page: 3 });

// Next page
api.emit('pagination:next', {});

// Previous page
api.emit('pagination:prev', {});

// Change page size to 25 rows per page (resets to page 1)
api.emit('pagination:pageSize', { pageSize: 25 });
```

### Upstream Reactivity

The plugin subscribes to state changes from upstream plugins (e.g. sort, filter). When the data array is replaced by another plugin, pagination automatically resets to page 1 and re-slices the new dataset.

### Plugin Order

Install the pagination plugin **after** filter and sort plugins so it paginates the already-transformed data:

```ts
plugins: [createSortPlugin(), createFilterPlugin(), createPaginationPlugin()]
```

## License

MIT
