# @trellisjs/server-prisma

One-line Prisma adapter for Trellis queries -- convert a `TrellisServerQuery`
into fully resolved Prisma operations and get back a standard response.

## Installation

```bash
npm install @trellisjs/server-prisma@alpha @trellisjs/server@alpha @prisma/client@7.10.1
npm install --save-dev prisma@7.10.1
```

Install `@prisma/adapter-mariadb@7.10.1` for MySQL or
`@prisma/adapter-pg@7.10.1` for PostgreSQL and pass it to your generated Prisma
client. See the executable [database fixture](../../tests/integration/prisma7/README.md).

## Prisma support

Version `0.1.0-alpha.3` requires `@prisma/client` **`^7.10.1`**
(stable versions `>=7.10.1 <8`). The supported providers are MySQL and
PostgreSQL. CI pins Prisma **7.10.1**, Node **24.19.0**, MySQL **8.4.11**
and PostgreSQL **18.6** using the drivers above. Prisma 5, 6, 8, and other
providers are outside this support contract. MySQL sessions must leave
`NO_BACKSLASH_ESCAPES` disabled for literal search.

## Alpha release channel

This guide describes `0.1.0-alpha.3`. Install both backend helpers at the same
version and check the npm `alpha` tags before adopting the alpha.3 APIs.
Alpha.2 already requires projections and query-field allowlists. Its Prisma
peer range was `>=5.0.0`, and it passed search text directly to Prisma
`contains`. See [migration from alpha.2](#migration-from-010-alpha2) and the
[release-channel policy](../../.changeset/README.md#backend-alpha-channel).

## API

### `trellisPrismaQuery<T>(model, query, options)`

Executes a Trellis query against a Prisma model and returns paginated results.

The returned `total` is unfiltered and `filtered` is counted over the full filtered dataset before `skip` / `take`. The frontend consumes `data`, `total` and `filtered`; extra pagination metadata is optional. See the [server-side integration guide](../../examples/vue-server-side/README.md) for the frontend contract, current/proposed versions and Vue example.

**Parameters:**

- `model` -- a Prisma delegate (e.g. `prisma.user`).
- `query` -- a `TrellisServerQuery` from `@trellisjs/server`.
- `options` (required):
  - `select` -- explicit Prisma scalar field projection. At least one field must
    be `true`; nested relation selections are not supported. Never derive it
    from request parameters. A TypeScript result type does not remove fields.
  - `searchableColumns` -- column names included in global search (`OR` with
    `contains`). Defaults to no allowed columns.
  - `filterableColumns` -- column IDs allowed in column filters. Defaults to none.
  - `sortableColumns` -- column IDs allowed in sorting. Defaults to none.
  - `columnMap` -- maps Trellis column IDs to different Prisma field names.
    Mapping does not authorize a column; lists use the incoming column IDs.
  - `stringFilterMode` -- `'default'` (default) follows database collation and
    omits Prisma's `mode` property. Use `'insensitive'` explicitly with
    PostgreSQL when case-insensitive search is needed. MySQL must use
    `'default'`; this adapter does not infer the provider.

Missing projections, unknown query columns, invalid mappings and malformed
queries reject before any database call. Global search also rejects if no
searchable columns are configured. Query permissions are independent of the
returned projection: a field may be allowed for sorting without being returned.
The adapter uses `AND` to combine global and column filters, and preserves
multi-column sorting order.

### Literal text search

Global search and string column filters use literal substring matching. Pass
the text as entered: `%`, `_` and backslash match themselves, including a
backslash at the end of the search term. The adapter escapes the text for
Prisma `contains`; LIKE patterns are not part of this API. Case and accent
comparison still follow the database collation and `stringFilterMode`.

A search string containing NUL (`\u0000`) rejects with `TypeError` before
`count` or `findMany`. Handle it as invalid client input. Empty search text
and non-string equality filters keep their existing behavior.

### Consistent counts and rows

Counts and rows must come from the same database snapshot when other requests
can write concurrently. A normal delegate does not create a transaction, and
PostgreSQL's default ReadCommitted transaction does not provide one snapshot
across all three reads. Pass the **transaction-bound** delegate inside a
RepeatableRead transaction for MySQL/PostgreSQL. This works with the published
`0.1.0-alpha.2` API:

```ts
const result = await prisma.$transaction(
  (tx) => trellisPrismaQuery(tx.user, query, {
    select: { id: true, name: true, email: true },
    searchableColumns: ['name', 'email'],
    filterableColumns: ['name', 'email'],
    sortableColumns: ['id', 'name', 'email'],
  }),
  { isolationLevel: 'RepeatableRead' },
);
```

**Since alpha.3**, `withPrismaSnapshot(client, operation)` supplies
the same RepeatableRead boundary, preserves the callback result type and passes
the generated transaction client to the callback:

```ts
import { trellisPrismaQuery, withPrismaSnapshot } from '@trellisjs/server-prisma';

const result = await withPrismaSnapshot(prisma, (tx) =>
  trellisPrismaQuery(tx.user, query, options),
);
```

Pass the root PrismaClient to this helper; an existing transaction client is
rejected, because a nested transaction cannot establish the promised isolation
boundary independently of its parent. Use `tx.user` inside the callback;
reading through the outer `prisma.user`
bypasses the snapshot. The helper is intended for short read operations on
MySQL/PostgreSQL. Keep authentication and other network work outside the
transaction. Client-level transaction timeout/max-wait settings still apply;
database and callback errors propagate without automatic retries. Other
providers are not validated for this helper. An application already managing
a suitable transaction can call `trellisPrismaQuery(tx.user, ...)` directly.
Separate page requests each get a new snapshot; this does not freeze a dataset
across a user's whole browsing session. See Prisma's
[transaction isolation documentation](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions#transaction-isolation-level).

Since alpha.3, `trellisPrismaQuery` checks safe non-negative counts,
`filtered <= total` and the exact page length before returning. Contradictory
results throw the exported `PrismaConsistencyError`; counts are not clamped
and rows are not silently relabelled. This catches observable races outside a
snapshot, but cannot prove that a structurally valid result came from one
snapshot. Use the transaction boundary for that guarantee. Handle errors with
a friendly application HTTP response instead of returning raw database errors.

**`trellisPrismaQuery` returns:**

```ts
{
  data: T[];
  total: number;
  filtered: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

## Quick Usage

```ts
import { parseTrellisQuery } from '@trellisjs/server';
import { trellisPrismaQuery } from '@trellisjs/server-prisma';

// Express / Fastify handler
app.get('/api/users', async (req, res) => {
  const query = parseTrellisQuery(req.query);
  const result = await prisma.$transaction(
    (tx) => trellisPrismaQuery(tx.user, query, {
      select: { id: true, name: true, email: true },
      searchableColumns: ['name', 'email'],
      filterableColumns: ['name', 'email'],
      sortableColumns: ['id', 'name', 'email'],
      // PostgreSQL: add stringFilterMode: 'insensitive' when required.
    }),
    { isolationLevel: 'RepeatableRead' },
  );
  res.json(result);
});
```

## Migration from 0.1.0-alpha.1

Add `select` and separate query-field allowlists to every call. Previously
unrestricted sorting and column filtering are now rejected by default. The old
implicit case-insensitive mode is opt-in, so PostgreSQL callers needing that
behavior must set `stringFilterMode: 'insensitive'`. Use explicit `select`;
`omit` is not forwarded.

Handle invalid client queries with a friendly HTTP error. Keep your own
authentication and tenant/row authorization in the backend; these field
permissions do not implement them. Pass an appropriately scoped delegate when
those restrictions are needed, including for both count operations.

## Migration from 0.1.0-alpha.2

- Upgrade both Trellis backend helpers together to `0.1.0-alpha.3`.
- Upgrade the Prisma CLI, generated client and driver adapter to Prisma 7.10.1
  or a matching supported Prisma 7 version, then regenerate the client.
- Remove any caller-side LIKE escaping. Search terms are now literal; callers
  that intentionally accepted wildcard patterns need a separate backend query.
- Treat NUL in search text as an invalid query, consistently on both databases.
- Use `withPrismaSnapshot` or keep an existing RepeatableRead transaction for
  consistent counts and rows. Handle `PrismaConsistencyError` as a backend
  error rather than returning an invalid page.

## Validation

On 2026-11-08, isolated MySQL 8.4.11 and PostgreSQL 18 databases were exercised
with generated Prisma 6.19.0 clients. Explicit projections, global search,
column filters, sorting, pagination and counts passed on both providers;
unauthorized field requests were rejected before database calls. That earlier
run did not validate concurrent writes.

On 2026-11-14 the new Prisma 7.10.1 fixture passed **12 cases per provider** on
MySQL 8.4.11 and PostgreSQL 18.6. Separate reader and writer clients prove
committed insert/delete/update interleavings, filtered and unfiltered snapshot
pagination, rejection of non-snapshot inconsistencies, CJS/ESM exports and
connection cleanup after errors. Snapshot pagination responses are also checked
through the frontend datasource's real HTTP validator. See the
[fixture guide](../../tests/integration/prisma7/README.md) for exact scope,
reproduction and CI status.

## License

MIT
