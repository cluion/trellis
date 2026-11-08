# @trellisjs/plugin-datasource

Datasource abstraction for Trellis data tables, with built-in static (local) and remote (HTTP) implementations.

The automatic server-side API below is an unreleased change. Current manifests and proposed release versions are listed in the [release status](../../examples/vue-server-side/README.md#versions-and-release-status); it is not yet available from the current npm versions.

## Installation

```bash
npm install @trellisjs/plugin-datasource
```

## Exports

| Export | Description |
|---|---|
| `createStaticDatasource<T>(data, options?)` | Local datasource that performs sorting, filtering, and pagination in memory. |
| `createRemoteDatasource<T>(options)` | HTTP datasource that sends standardized queries to a backend API. |
| `createDatasourcePlugin<T>({ datasource, initialQuery? })` | Automatic server-side queries, authoritative totals, loading/errors, reload/retry/cancel and stale-response protection. |
| `buildQueryFromState(api)` | Builds a `TrellisQuery` from the current Trellis state (sorting, filtering, pagination). |
| `TrellisQuery` | Query shape sent to `datasource.fetch()`. |
| `TrellisResponse<T>` | Expected response shape: `{ data, total, filtered }`. |
| `TrellisDatasource<T>` | Interface: `{ fetch(query, context?): Promise<TrellisResponse<T>> }`; optional context provides `signal`. |
| `DatasourcePluginOptions<T>` | Required `datasource` and optional `initialQuery: Partial<TrellisQuery>`. |
| `RemoteDatasourceOptions<T>` | HTTP URL, method, headers and query/response transforms. |
| `DatasourceFetchContext` | Optional request `signal: AbortSignal`. |
| `DatasourceState` | Observable `{ loading, error, total, filtered }`; also exported by core. |

For automatic fetching, install `createDatasourcePlugin()` alongside the filter, sort and pagination plugins. Observe `state.datasource` and emit `datasource:reload`, `datasource:retry` or `datasource:cancel`. See the [server-side API and Vue example](../../examples/vue-server-side/README.md) for the protocol, HTTP validation, pagination rules and release status.

## Usage

### Automatic Server-Side Table

```ts
import { Trellis } from '@trellisjs/core';
import { createDatasourcePlugin, createRemoteDatasource } from '@trellisjs/plugin-datasource';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { createSortPlugin } from '@trellisjs/plugin-sort';

interface User {
  id: number;
  name: string;
}

const table = new Trellis<User>({
  data: [],
  columns: [{ id: 'name', accessor: 'name', header: 'Name' }],
  rowId: 'id',
  plugins: [
    createDatasourcePlugin({
      datasource: createRemoteDatasource<User>({ url: '/api/users', method: 'GET' }),
      initialQuery: {
        page: 1,
        pageSize: 25,
        sort: [{ columnId: 'name', direction: 'asc' }],
      },
    }),
    createFilterPlugin({ searchDebounceMs: 250 }),
    createSortPlugin(),
    createPaginationPlugin(),
  ],
});
const { api } = table;
```

This automatically requests the initial query and replaces rows when it succeeds. Query changes trigger subsequent requests; search, column filters, sorting and page size changes reset to page 1. Synchronous changes are coalesced into one request. Plugin installation order does not affect these built-in transforms. Create one plugin instance per table.

Use a stable backend key for `rowId`. Framework-free consumers call `table.destroy()` when finished; Vue and React adapters handle disposal. Datasources without a `context` parameter remain compatible; forwarding `context?.signal` enables transport cancellation. Stale results are ignored even when a custom datasource ignores that signal.

### State and Commands

```ts
const unsubscribe = api.subscribe((state) => {
  const request = state.datasource;
  if (request) {
    console.log(request.loading, request.error, request.total, request.filtered);
  }
});
// Call unsubscribe() when your own observer is no longer needed.
```

| State | Meaning |
|---|---|
| `dataMode` | `'server'` while the datasource plugin owns querying. |
| `datasource.loading` | True from request start until success/failure or the explicit cancel command. |
| `datasource.error` | `Error \| null`; show a friendly UI message and use the error for diagnostics. |
| `datasource.total` | Backend count before filtering. |
| `datasource.filtered` | Backend count after filtering; also `pagination.totalItems`. |

| Command | Meaning |
|---|---|
| `api.emit('datasource:reload')` | Request the current query again, cancelling older work. |
| `api.emit('datasource:retry')` | Same operation; usable after failure or cancellation. |
| `api.emit('datasource:cancel')` | Cancel queued/active work; set loading false and clear error. |

Initial request status is `{ loading: false, error: null, total: 0, filtered: 0 }`. Loading and failures preserve the previous successful rows/counts. Use status to distinguish them from the latest query's results. An out-of-range response must have empty `data`; the plugin corrects and refetches the last page (page 1 for zero results). `getFilteredData()` only contains the loaded page in this mode.

`table.stop()` pauses resources while retaining the last state snapshot for adapter remounts. For a visible UI cancellation that also clears loading/error state, emit `datasource:cancel`.

### Static Datasource (Client-Side)

```ts
import { createStaticDatasource } from '@trellisjs/plugin-datasource';

const ds = createStaticDatasource([
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
]);

const result = await ds.fetch({
  page: 1,
  pageSize: 10,
  sort: [{ columnId: 'age', direction: 'asc' }],
  filter: { global: 'ali' },
});
// result.data   --> [{ name: 'Alice', age: 30 }]
// result.total  --> 2
// result.filtered --> 1
```

### Remote Datasource (Manual Fetch)

```ts
import { createRemoteDatasource } from '@trellisjs/plugin-datasource';

interface User { id: number; name: string }

const ds = createRemoteDatasource<User>({
  url: '/api/users',
  method: 'POST',                 // default
  headers: { Authorization: 'Bearer ...' },
  transformQuery: (q) => ({       // adapt to your API contract
    page: q.page,
    per_page: q.pageSize,
    sort_by: q.sort?.[0]?.columnId,
    sort_dir: q.sort?.[0]?.direction,
  }),
  transformResponse: (raw) => {
    // The datasource validates the mapped fields after this transform.
    const payload = raw as { items: User[]; total_count: number; filtered_count: number };
    return { data: payload.items, total: payload.total_count, filtered: payload.filtered_count };
  },
});

const controller = new AbortController();
const result = await ds.fetch({ page: 1, pageSize: 20 }, { signal: controller.signal });
```

Calling the transport directly does not update a table or manage loading/retry state. Use `createDatasourcePlugin()` for that integration. Direct transport errors reject the returned promise; callers handle rejection and may cancel using `controller.abort()`.

### HTTP Options and Validation

| Option | Type / default | Behavior |
|---|---|---|
| `url` | required string | API endpoint; existing GET parameters are retained. |
| `method` | `'GET' \| 'POST'`, default `'POST'` | GET encodes parameters; POST sends JSON. |
| `headers` | `Record<string, string>`, default `{}` | Overrides/adds default JSON request headers. |
| `transformQuery` | `(query: TrellisQuery) => unknown` | Used by both methods. GET expects a key/value object; nested values are JSON-encoded. |
| `transformResponse` | `(raw: unknown) => TrellisResponse<T>` | Maps a custom response before validation. |

GET overrides existing same-name parameters with provided query values, preserves other/repeated parameters and fragments, and omits `undefined` query properties. See the [GET transformation example](../../examples/vue-server-side/README.md#http-and-response-validation).

Responses must contain an array of row objects and safe integer counts `0 <= filtered <= total`. Row count must equal `min(pageSize, max(0, filtered - (page - 1) * pageSize))`; sparse arrays, partial non-final pages and nonempty out-of-range pages are rejected. Page/size must be positive safe integers with a safe calculated offset. HTTP status, network, JSON, transform and validation failures are exposed through `state.datasource.error` for plugin-managed requests.

### Build Query from Trellis State

```ts
import { buildQueryFromState } from '@trellisjs/plugin-datasource';

const query = buildQueryFromState(api);
// { page, pageSize, sort?, filter? }
```

## TrellisQuery Shape

```ts
interface TrellisQuery {
  page: number;                          // 1-based
  pageSize: number;
  sort?: { columnId: string; direction: 'asc' | 'desc' }[];
  filter?: { global?: string; columns?: Record<string, unknown> };
}
```

## TrellisResponse Shape

```ts
interface TrellisResponse<T> {
  data: T[];       // rows for the current page
  total: number;   // total rows (unfiltered)
  filtered: number; // total rows after filtering
}
```

## License

MIT
