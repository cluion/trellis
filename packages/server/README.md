# @trellisjs/server

Backend query parser for Trellis -- parse, sanitize, and convert Trellis query
parameters into SQL clauses.

## Installation

```bash
npm install @trellisjs/server
```

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

```ts
const query = parseTrellisQuery(request.query);
```

### `buildWhereClause(columns, filter?)`

Builds a parameterized SQL `WHERE` clause from the filter state. Global search
produces cross-column `OR`; column filters are joined with `AND`. Column names
are validated against a safe regex to prevent injection.

```ts
const { sql, params } = buildWhereClause(['name', 'email'], query.filter);
```

### `buildOrderByClause(sort?)`

Builds a SQL `ORDER BY` clause from the sort state. Unsafe column names are
filtered out.

```ts
const orderBy = buildOrderByClause(query.sort); // "ORDER BY name ASC"
```

### `buildResponse(data, options)`

Constructs the standard Trellis response envelope with pagination metadata.

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
const orderBy = buildOrderByClause(query.sort);
const rows = await db.all(`SELECT * FROM users ${sql} ${orderBy} LIMIT ? OFFSET ?`,
  [...params, query.pageSize, (query.page - 1) * query.pageSize]);
const total = await db.get(`SELECT COUNT(*) AS count FROM users`);
return buildResponse(rows, { total: total.count, filtered: rows.length, query });
```

## License

MIT
