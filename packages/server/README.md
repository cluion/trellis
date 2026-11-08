# @trellisjs/server

Backend query parser for Trellis -- parse, sanitize, and convert Trellis query
parameters into SQL clauses.

## Installation

```bash
npm install @trellisjs/server@alpha
```

## Alpha release channel

`0.1.0-alpha.2` includes the query validation and column authorization changes
documented below. Install the `alpha` tag or pin that version; the `latest` tag
continues to use the earlier API. Backend helpers are versioned together outside
the stable Changesets version PR. See the
[release-channel policy](../../.changeset/README.md#backend-alpha-channel).

## API

### Types

**`TrellisServerQuery`** -- parsed query structure:

```ts
interface TrellisServerQuery {
  page: number;
  pageSize: number;
  sort?: { columnId: string; direction: 'asc' | 'desc' }[];
  filter?: { global?: string; columns?: Record<string, unknown> };
}
```

**`WhereClause`** -- built WHERE result: `{ sql: string; params: unknown[] }`.

### `parseTrellisQuery(raw)`

Parses raw HTTP request parameters (query string or JSON body) into a
`TrellisServerQuery`. Accepts `sort` and `filter` as JSON strings or objects.
Enforces defaults: page 1, pageSize 10, max pageSize 1000.

Pagination values must be safe integers, and `(page - 1) * pageSize` must also
be safe. Fractions, infinity, invalid numeric strings, arrays and booleans are
rejected. Existing zero/default and negative-value normalization is retained.
Malformed JSON, invalid sort criteria and object/array filter values throw
`TypeError`; an unsafe offset throws `RangeError`. Map invalid client queries
to a friendly HTTP 400 response rather than exposing raw errors.

```ts
const query = parseTrellisQuery(request.query);
```

### `buildWhereClause(columns, filter?)`

Builds a parameterized SQL `WHERE` clause from the filter state. Global search
produces cross-column `OR`; column filters are joined with `AND`. Column names
must match both the supplied allowlist and the SQL identifier format. Unknown
columns are rejected, including filters with an empty value. An empty allowlist
disables global search. Values remain parameterized.

```ts
const { sql, params } = buildWhereClause(['name', 'email'], query.filter);
```

### `buildOrderByClause(sort, columns)`

Builds a SQL `ORDER BY` clause using an explicit sortable-column allowlist.
Unknown or unsafe column names throw `TypeError`; they are not silently dropped.

```ts
const orderBy = buildOrderByClause(query.sort, ['name', 'email']);
```

### `buildResponse(data, options)`

Constructs the standard Trellis response envelope with pagination metadata.

`total` is the count before filtering; `filtered` is the count after applying the same WHERE conditions as the data query, before `LIMIT` / `OFFSET`. Neither count is the length of the current page. Additional `page`, `pageSize` and `totalPages` metadata may be returned; the frontend datasource derives navigation from `filtered` and its own query.

```ts
const result = buildResponse(rows, { total, filtered, query });
```

## Quick Usage

```ts
import {
  parseTrellisQuery,
  buildWhereClause,
  buildOrderByClause,
  buildResponse,
} from '@trellisjs/server';

// Inside an Express handler:
const query = parseTrellisQuery(req.query);
const { sql, params } = buildWhereClause(['name', 'email'], query.filter);
const orderBy = buildOrderByClause(query.sort, ['name', 'email']);
const rows = await db.all(`SELECT id, name, email FROM users ${sql} ${orderBy} LIMIT ? OFFSET ?`,
  [...params, query.pageSize, (query.page - 1) * query.pageSize]);
const total = await db.get(`SELECT COUNT(*) AS count FROM users`);
const filtered = await db.get(`SELECT COUNT(*) AS count FROM users ${sql}`, params);
return buildResponse(rows, { total: total.count, filtered: filtered.count, query });
```

This is a handler excerpt using an asynchronous SQLite-style `db.all` / `db.get` adapter. GET uses `req.query`; POST uses `req.body` after your framework's JSON middleware. `parseTrellisQuery` caps page size at 1000, so keep the frontend's allowed sizes within that limit or reject unsupported sizes before parsing. A server-side response must include exactly the requested page's rows, with empty `data` for out-of-range pages; do not silently substitute another page. See the [frontend protocol and validation rules](../../examples/vue-server-side/README.md#http-and-response-validation).

## Migration from 0.1.0-alpha.1

Pass the sortable-column list as the second argument to every
`buildOrderByClause` call. The `columns` argument to `buildWhereClause` now
authorizes column filters as well as global search. Define these lists in
trusted backend code. Invalid queries now fail explicitly; handle validation
errors before sending a response. Authentication, tenant restrictions and the
columns returned by your SQL query remain application responsibilities.

## License

MIT
