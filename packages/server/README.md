# @trellisjs/server

Backend query parser for Trellis -- parse, sanitize, and convert Trellis query
parameters into SQL clauses.

## Installation

```bash
npm install @trellisjs/server@alpha
```

## Alpha release channel

This guide describes `0.1.0-alpha.3`. The install command uses the current npm
`alpha` tag; check the tag before adopting the alpha.3 APIs. Backend helpers
are versioned together outside the stable Changesets PR. See the
[release-channel policy](../../.changeset/README.md#backend-release-channels).

Alpha.3 adds SQL quoting, dialect options, literal LIKE matching, and
`buildResponse` contract validation. Alpha.2 uses unquoted identifiers, `?`
parameters and unescaped LIKE patterns, and builds responses without these
contract checks. See [direct migration from alpha.1](#migration-from-010-alpha1)
or [migration from alpha.2](#migration-from-010-alpha2).

## Support scope for the first stable release

The planned release baseline is Node.js 24 LTS with ESM, CommonJS and TypeScript
declarations. CI uses Node.js 24.19.0. The query parser and response builder
are database independent. SQL generation supports SQLite (`node:sqlite` in
tests), MySQL (8.4.11 in CI), and PostgreSQL (18.6 in CI). These are the tested
versions; other database versions, runtimes and driver combinations are outside
the first stable release's verified scope. Use parameters in your driver and
keep count and page reads in a suitable snapshot when writes can occur.

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

**`SqlQueryOptions` / `SqlDialect`** -- backend SQL configuration (alpha.3):

```ts
type SqlDialect = 'sqlite' | 'mysql' | 'postgresql';

interface SqlQueryOptions {
  dialect?: SqlDialect; // default: 'sqlite'
  likeMode?: 'literal' | 'wildcard'; // default: 'literal'
  parameterOffset?: number; // default: 0; preceding PostgreSQL bindings
}
```

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

### `buildWhereClause(columns, filter?, options?)`

Builds a parameterized SQL `WHERE` clause from the filter state. Global search
produces cross-column `OR`; column filters are joined with `AND`. Column names
must match both the supplied allowlist and the simple identifier format
`[A-Za-z_][A-Za-z0-9_]*`. Authorized names are quoted, including SQL reserved
words. Quoting does not grant permission: unknown/unsafe names are rejected,
including filters with an empty value. An empty allowlist rejects a non-empty
global search. Qualified names, aliases, expressions and prequoted identifiers
are not supported. Values remain parameterized.

```ts
const { sql, params } = buildWhereClause(['name', 'email'], query.filter);
```

Global search and string-column filters both use **literal contains** matching
by default. Pass raw search text; do not pre-escape quotes or LIKE characters.
The helper escapes `%`, `_` and `!` once, wraps the result in `%...%`, and emits
`LIKE <parameter> ESCAPE '!'`. Quotes and backslashes stay bound data, rather
than becoming SQL string literals. For example, searching `50%_!` binds
`%50!%!_!!%`, matching that literal substring. Searching `%` no longer matches
every non-null row.

NUL (`\u0000`) in a global/string-column search throws `TypeError` in both
modes, rather than allowing SQLite to truncate a LIKE pattern. This restriction
applies consistently across the supported dialects.

When the backend intentionally allows SQL wildcards, opt in explicitly:

```ts
buildWhereClause(['name'], { global: 'a_b' }, { likeMode: 'wildcard' });
```

This still performs contains matching: `%` matches a sequence and `_` one
character, so `a_b` can match both `a_b` and `acb`. `!` and backslash remain
literal in this mode; it does not accept arbitrary SQL or regular expressions.
An empty global query/string filter is still skipped, as in alpha.2. Numeric
and boolean column values use equality and retain their bound value types;
the application must use types supported by its driver (for example, SQLite
drivers may require `0` / `1` for booleans).

### SQL dialect and comparison scope

| `dialect` | Identifier quoting | Bound parameters |
| --- | --- | --- |
| `sqlite` (default) | Backticks, supported by SQLite | `?` |
| `mysql` | Backticks | `?` |
| `postgresql` | Double quotes, preserving identifier case | `$1`, `$2`, … |

Set these options in trusted backend code and use the same dialect for WHERE
and ORDER BY. They are not request-query fields and are not inferred from a
connection. Unsupported dialects/modes or invalid offsets fail explicitly.
The parser/response builder themselves are independent of this SQL rendering
scope; other SQL dialects are not supported by these builders.

Literal mode only controls wildcard interpretation. Case, accent, Unicode and
collation behavior remain database-defined: this helper emits `LIKE`, not
`LOWER` or `ILIKE`. Global search and string filters require text-compatible
columns; PostgreSQL does not automatically make numeric columns text for
LIKE. Choose the searchable allowlist accordingly. No automatic casts,
field-type discovery or schema/column mapping are performed.

For PostgreSQL, `parameterOffset` counts parameters already bound before the
generated filter. It must be a non-negative safe integer; nonzero values are
rejected for SQLite/MySQL. `params` contains only the newly generated values,
in SQL placeholder order:

```ts
const where = buildWhereClause(['name', 'email'], query.filter, {
  dialect: 'postgresql',
  parameterOffset: 1,
});
const suffix = where.sql ? ` AND (${where.sql.slice(6)})` : '';
const rows = await db.query(
  `SELECT id, name FROM users WHERE tenant_id = $1${suffix}`,
  [tenantId, ...where.params],
);
```

This is a condition-composition excerpt. Apply the same scope and filter to
the filtered count, and scope the unfiltered total as well. Run count/page
queries within your driver's suitable snapshot transaction when concurrent
writes are possible; SQL clause builders do not manage connections or
transactions. Bind all later pagination values with the next available
PostgreSQL indices rather than restarting at `$1`.

The escape/quoting syntax follows the official
[SQLite keyword](https://www.sqlite.org/lang_keywords.html) and
[LIKE](https://www.sqlite.org/lang_expr.html#like) references,
[MySQL LIKE](https://dev.mysql.com/doc/refman/8.4/en/string-comparison-functions.html#operator_like)
and [PostgreSQL LIKE](https://www.postgresql.org/docs/18/functions-matching.html#FUNCTIONS-LIKE)
documentation. Values remain bound by the application's driver.

### `buildOrderByClause(sort, columns, options?)`

Builds a SQL `ORDER BY` clause using an explicit sortable-column allowlist.
Unknown or unsafe column names throw `TypeError`; they are not silently dropped.
Every authorized field is quoted for the selected dialect, preserving the
caller-specified multi-column sorting order.

SQL formatting includes identifier quotes and explicit LIKE escapes. Pass the
SQL clause and its parameters to the driver without rewriting the quotes or
substituting values.

```ts
const orderBy = buildOrderByClause(query.sort, ['id', 'name', 'email']);
```

### Pagination order

`buildOrderByClause` returns an empty string for an omitted or empty sort. It
does not know your schema or infer a primary key. Before applying `LIMIT` and
`OFFSET`, the handler must supply a sort that uniquely orders the result set.
The [shared example](../../examples/vue-server-side/user-page-order.ts) uses a
non-null primary key: missing or empty sort becomes `id ASC`, and `name DESC`
becomes `name DESC, id ASC`. A request already sorting on `id` keeps its
position and direction. Every field, including the default key, must be in the
trusted sort allowlist; choose another key for results where `id` is not unique.

This guarantees a repeatable order for the same rows, filters and sort.
Separate offset page requests can still see inserts, deletes or reordered rows
between snapshots. See the [MySQL LIMIT guide](https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html)
and [PostgreSQL LIMIT guide](https://www.postgresql.org/docs/18/queries-limit.html).

### `buildResponse(data, options)`

Constructs the standard Trellis response envelope with pagination metadata.

`total` is the count before filtering; `filtered` is the count after applying the same WHERE conditions as the data query, before `LIMIT` / `OFFSET`. Neither count is the length of the current page. Additional `page`, `pageSize` and `totalPages` metadata may be returned; the frontend datasource derives navigation from `filtered` and its own query.

```ts
const result = buildResponse(rows, { total, filtered, query });
```

**Contract validation (alpha.3):** the builder rejects a response that would
fail the frontend datasource's row/count/page-length validation:

- `data` must be an array of non-null, non-array row objects; sparse arrays
  and primitive rows are rejected. Row fields are not serialized or schema-validated.
- `total` and `filtered` must be non-negative safe integer numbers with
  `filtered <= total`. Strings, `bigint`, fractions and non-finite counts are
  rejected rather than converted or clamped.
- `query.page` and `query.pageSize` must be positive safe integers, and
  `(page - 1) * pageSize` must be safe. Pass the effective query used to fetch
  the data; the builder does not default, cap or normalize pagination. The
  parser's existing page-size cap of 1000 still applies when parsing requests.
- The exact page length is
  `min(pageSize, max(0, filtered - (page - 1) * pageSize))`. A partial page is
  accepted only at the end. Missing or excess rows are rejected, including
  non-empty zero-result or out-of-range pages.

| Request / counts | Required rows | Returned metadata |
| --- | --- | --- |
| page 1, size 3, total 20, filtered 8 | 3 | page 1, totalPages 3 |
| page 3, size 3, total 20, filtered 8 | 2 | page 3, totalPages 3 |
| page 1, size 3, total 20, filtered 0 | 0 | page 1, totalPages 1; total stays 20 |
| page 1, size 3, total 0, filtered 0 | 0 | page 1, totalPages 1 |
| page 4, size 3, total 20, filtered 8 | 0 | page 4, totalPages 3 |
| page 4, size 3, total 20, filtered 0 | 0 | page 4, totalPages 1; total stays 20 |

The builder preserves the requested page, original rows and both counts. It
does not substitute another page or relabel rows. The frontend can then apply
its existing out-of-range correction and fetch the corrected page. Zero
matches always have `totalPages: 1`.

Invalid options, rows, counts or page lengths throw `TypeError`; invalid
pagination or an unsafe offset throws `RangeError`. These are synchronous
checks before constructing the envelope. A backend-result validation failure
should become a friendly server-error response. Handle invalid request input
separately during query parsing rather than mapping every `TypeError` to HTTP
400. Error messages are diagnostics, not response payloads for end users.

Validation detects contradictory results; it cannot establish snapshot
consistency. Keep count/page queries in a suitable transaction when writes
can occur concurrently. The helper does not manage connections or retry reads.

## Quick Usage

```ts
import {
  parseTrellisQuery,
  buildWhereClause,
  buildOrderByClause,
  buildResponse,
} from '@trellisjs/server';
import { orderUserPages } from './user-page-order'; // Copy the shared backend example.

// Inside an Express handler:
const query = parseTrellisQuery(req.query);
const { sql, params } = buildWhereClause(['name', 'email'], query.filter);
const orderBy = buildOrderByClause(orderUserPages(query.sort), ['id', 'name', 'email']);
const rows = await db.all(`SELECT id, name, email FROM users ${sql} ${orderBy} LIMIT ? OFFSET ?`,
  [...params, query.pageSize, (query.page - 1) * query.pageSize]);
const total = await db.get(`SELECT COUNT(*) AS count FROM users`);
const filtered = await db.get(`SELECT COUNT(*) AS count FROM users ${sql}`, params);
return buildResponse(rows, { total: total.count, filtered: filtered.count, query });
```

This is a handler excerpt using an asynchronous SQLite-style `db.all` / `db.get` adapter; run its queries within a driver-managed snapshot when writes can occur concurrently. GET uses `req.query`; POST uses `req.body` after your framework's JSON middleware. `parseTrellisQuery` caps page size at 1000, so keep the frontend's allowed sizes within that limit or reject unsupported sizes before parsing. A server-side response must include exactly the requested page's rows, with empty `data` for out-of-range pages; do not silently substitute another page. See the [frontend protocol and validation rules](../../examples/vue-server-side/README.md#http-and-response-validation).

## Migration from 0.1.0-alpha.1

You can upgrade directly to `0.1.0-alpha.3`. Pin the version, since a bare
install resolves the npm `latest` tag and may still select alpha.1:

```sh
npm install --save-exact @trellisjs/server@0.1.0-alpha.3
```

If you also use the Prisma adapter, follow its
[paired upgrade guide](../server-prisma/README.md#migration-from-010-alpha1).

1. **Authorize query fields.** Pass a backend-owned allowlist as the second
   argument to `buildOrderByClause`. The first argument to `buildWhereClause`
   now allows both global search and column filters, so include only fields
   intended for those uses. Unknown fields now fail instead of being accepted
   or ignored. Keep authorization for rows and the returned projection in
   your application.
2. **Validate the request at the HTTP boundary.** Use `parseTrellisQuery`.
   Send integer `page` / `pageSize`, valid sort directions, and scalar column
   filter values. GET may encode `sort` / `filter` as JSON; POST can send them
   directly. Malformed criteria and unsafe pagination now fail explicitly.
   The parser still caps `pageSize` at 1000; keep the frontend within that
   limit or reject an excessive request before parsing.
3. **Update SQL and search.** Pass the database dialect to both SQL builders
   where needed. PostgreSQL uses numbered bindings, including earlier scope
   parameters; SQLite/MySQL use `?`. Keep the helper's identifier quotes and
   bind values through your driver. Send raw search text: `%`, `_`, and
   backslash are literal by default, and NUL is rejected. If your application
   intentionally offers `%` / `_` patterns, set `likeMode: 'wildcard'` in
   trusted backend code. Remove any caller-side LIKE escaping.
4. **Make page results consistent.** Apply a default order and use a unique
   key to break ties before fetching the slice. Pass the effective query and
   two numeric counts to `buildResponse`: `total` before filtering,
   `filtered` after filtering and before pagination. Return only the rows
   belonging to the requested page; for zero results or an out-of-range
   page, return `[]` with the original page number. Read counts and rows from
   a suitable snapshot when writes are possible. Treat invalid request data
   as a client error and invalid database results as a server error.

The [updated SQL handler](#quick-usage) shows the full call sequence. Before
deploying, verify same-value rows over two pages, literal search, the final
partial page, and empty or out-of-range results.

## Migration from 0.1.0-alpha.2

- `buildResponse` now rejects invalid counts, row objects, pagination and page
  lengths instead of emitting an envelope the frontend cannot accept. Keep
  `total` / `filtered` before pagination, honor the effective requested size,
  and return empty rows for out-of-range pages without changing the page.
  Handle backend-result errors separately from invalid client input.
- SQL identifiers now include quotes, so reserved names work. Existing valid
  two-argument SQLite/MySQL calls retain their `?` parameter format. Adjust
  exact-SQL assertions; do not remove the quotes at runtime.
- `%` and `_` in string input are now literal by default. Set trusted backend
  `likeMode: 'wildcard'` if wildcard contains matching is intended. Remove any
  application-side LIKE pre-escaping to avoid escaping the text twice.
- `ESCAPE '!'` makes the pattern escape character explicit. Backslash is
  literal in both modes; old connector-specific backslash pattern conventions
  are not preserved.
- NUL search text now throws `TypeError`; handle it as invalid client input
  rather than letting a database truncate the pattern.
- PostgreSQL callers must pass `{ dialect: 'postgresql' }` and compose any
  preceding/later parameter indices correctly.
- These options apply to the SQL builders only. The Prisma adapter has a
  separate [literal text search contract](../server-prisma/README.md#literal-text-search).

## Validation

The package tests execute generated clauses against Node's in-memory SQLite.
The [real-database fixture](../../tests/integration/prisma7/README.md) also
executes these SQL helpers through pinned drivers on MySQL/PostgreSQL, including
reserved columns, literal special characters/Unicode, explicit wildcards,
bound values and PostgreSQL parameter composition. These checks are separate
from the Prisma adapter snapshot tests. Final run results and supported
versions are recorded in that fixture guide; neither suite is a production
load or arbitrary-database compatibility claim.

Earlier SQL-stage validation on 2026-11-14 (Linux ARM64, Node 24.19.0) passed 78 server
tests, including actual SQLite queries; MySQL 8.4.11 and PostgreSQL 18.6 each
passed 21 SQL cases plus 12 Prisma snapshot regressions. The checkout Vue
example also passed its Chromium/Firefox/WebKit regression.

The response-contract stage adds 74 package cases and six real HTTP cases.
On 2026-11-14, all 152 server tests, nine loopback HTTP tests and 52 datasource
tests passed, along with the server ESM/CJS/declaration build, type check and
changed-code lint/format checks. This stage covers invalid counts/rows/query
pagination/page lengths, full and partial final pages, empty datasets, zero
matches and unchanged out-of-range metadata. It did not rerun the database or
browser suites, full monorepo CI, or remote CI. Those response changes are
included in the published `0.1.0-alpha.3`.

## License

MIT
