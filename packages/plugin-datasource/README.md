# @trellisjs/plugin-datasource

Datasource abstraction for Trellis data tables, with built-in static (local) and remote (HTTP) implementations.

## Installation

```bash
npm install @trellisjs/plugin-datasource
```

## Exports

| Export | Description |
|---|---|
| `createStaticDatasource<T>(data, options?)` | Local datasource that performs sorting, filtering, and pagination in memory. |
| `createRemoteDatasource<T>(options)` | HTTP datasource that sends standardized queries to a backend API. |
| `buildQueryFromState(api)` | Builds a `TrellisQuery` from the current Trellis state (sorting, filtering, pagination). |
| `TrellisQuery` | Query shape sent to `datasource.fetch()`. |
| `TrellisResponse<T>` | Expected response shape: `{ data, total, filtered }`. |
| `TrellisDatasource<T>` | Interface: `{ fetch(query): Promise<TrellisResponse<T>> }`. |

## Usage

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

### Remote Datasource (Server-Side)

```ts
import { createRemoteDatasource } from '@trellisjs/plugin-datasource';

const ds = createRemoteDatasource({
  url: '/api/users',
  method: 'POST',                 // default
  headers: { Authorization: 'Bearer ...' },
  transformQuery: (q) => ({       // adapt to your API contract
    page: q.page,
    per_page: q.pageSize,
    sort_by: q.sort?.[0]?.columnId,
    sort_dir: q.sort?.[0]?.direction,
  }),
  transformResponse: (raw) => ({   // adapt response to TrellisResponse
    data: raw.items,
    total: raw.total_count,
    filtered: raw.filtered_count,
  }),
});

const result = await ds.fetch({ page: 1, pageSize: 20 });
```

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
