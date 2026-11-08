# @trellisjs/plugin-pagination

Page navigation plugin for Trellis data tables with configurable page size.

## Installation

```bash
npm install @trellisjs/plugin-pagination
```

## Events

Payloads are typed through `TrellisEventMap`: once the plugin is imported, `api.on()` and `api.emit()` infer them. Exported payload types: `PaginationGotoPayload`, `PaginationPageSizePayload`.

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
- In client mode, `state.data` contains rows sliced from the local filtered/sorted dataset. In server mode, rows are replaced by the datasource response without another local slice.

### Server-Side Mode

Install `createDatasourcePlugin()` with this plugin. Page changes request backend data, and `state.pagination.totalItems` uses the backend's `filtered`; the unfiltered `total` remains in `state.datasource.total`. Page count is `Math.max(1, Math.ceil(filtered / pageSize))`. Zero results use page 1. If a response shows the requested page is out of range, the datasource corrects the page and refetches it.

Search, column filters, sorting and page-size changes reset to page 1 in server mode. To start on another page before counts are known, use `createDatasourcePlugin({ initialQuery: { page: 3 }, datasource })`. See the [server-side guide and Vue example](../../examples/vue-server-side/README.md).

## Usage

```ts
import { Trellis } from '@trellisjs/core';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';

const trellis = new Trellis({
  columns: [{ id: 'name', accessor: 'name', header: 'Name' }],
  data: Array.from({ length: 100 }, (_, index) => ({ name: `User ${index + 1}` })),
  plugins: [createPaginationPlugin()],
});
const { api } = trellis;

// Go to page 3
api.emit('pagination:goto', { page: 3 });

// Next page
api.emit('pagination:next');

// Previous page
api.emit('pagination:prev');

// Change page size to 25 rows per page (resets to page 1)
api.emit('pagination:pageSize', { pageSize: 25 });
```

### Upstream Reactivity

In client mode, each pipeline recompute filters and sorts the source data before pagination slices it. The current page is preserved when valid and clamped to the last available page if the result shrinks. Changing page size explicitly resets to page 1. Server-side query changes use the reset and refetch rules above.

### Plugin Order

Pipeline priority `30` puts pagination after filter (`10`) and sort (`20`), regardless of installation order. A typical configuration is:

```ts
plugins: [createSortPlugin(), createFilterPlugin(), createPaginationPlugin()]
```

## License

MIT
