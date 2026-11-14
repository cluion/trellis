# @trellisjs/server-prisma

One-line Prisma adapter for Trellis queries -- convert a `TrellisServerQuery`
into fully resolved Prisma operations and get back a standard response.

## Installation

```bash
npm install @trellisjs/server-prisma@alpha @trellisjs/server@alpha @prisma/client
```

Requires `@prisma/client` >= 5.

The continuous integration matrix currently exercises Prisma **7.10.1**, Node
**24.19.0**, MySQL **8.4.11** and PostgreSQL **18.6** with the official
`@prisma/adapter-mariadb` / `@prisma/adapter-pg` drivers. Prisma 7 requires a
generated client configured with a driver adapter; see the executable
[database fixture](../../tests/integration/prisma7/README.md). This matrix does
not establish support for every version allowed by the existing peer range.

## Alpha release channel

`0.1.0-alpha.2` includes the required projection, query-field allowlists and
provider-compatible string filtering documented below. Install both backend
packages from the `alpha` tag or pin `0.1.0-alpha.2`; the `latest` tags continue
to use the earlier API. Backend helpers are versioned together outside the stable
Changesets version PR. See the
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
    omits Prisma's `mode` property. Use `'insensitive'` explicitly with a
    supporting provider such as PostgreSQL or MongoDB. MySQL uses collation and
    must use `'default'`; this adapter does not infer the provider.

Missing projections, unknown query columns, invalid mappings and malformed
queries reject before any database call. Global search also rejects if no
searchable columns are configured. Query permissions are independent of the
returned projection: a field may be allowed for sorting without being returned.
The adapter uses `AND` to combine global and column filters, and preserves
multi-column sorting order.

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

**Unreleased checkout API:** `withPrismaSnapshot(client, operation)` supplies
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

Also **unreleased**: `trellisPrismaQuery` checks safe non-negative counts,
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
behavior must set `stringFilterMode: 'insensitive'`. Explicit `select` works with
the supported Prisma >= 5 range; `omit` is not required or forwarded.

Handle invalid client queries with a friendly HTTP error. Keep your own
authentication and tenant/row authorization in the backend; these field
permissions do not implement them. Pass an appropriately scoped delegate when
those restrictions are needed, including for both count operations.

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
