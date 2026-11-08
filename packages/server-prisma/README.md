# @trellisjs/server-prisma

One-line Prisma adapter for Trellis queries -- convert a `TrellisServerQuery`
into fully resolved Prisma operations and get back a standard response.

## Installation

```bash
npm install @trellisjs/server-prisma @trellisjs/server @prisma/client
```

Requires `@prisma/client` >= 5.

## Pending alpha release

The API below describes unreleased source changes. The package manifest remains
`0.1.0-alpha.1`; the published artifact with that version does not contain this
repair. Backend helpers are excluded from the stable version PR and will be
versioned/published through a separate approved alpha-only step. See the
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

**Returns:**

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
  const result = await trellisPrismaQuery(prisma.user, query, {
    select: { id: true, name: true, email: true },
    searchableColumns: ['name', 'email'],
    filterableColumns: ['name', 'email'],
    sortableColumns: ['id', 'name', 'email'],
    // PostgreSQL: add stringFilterMode: 'insensitive' when required.
  });
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
unauthorized field requests were rejected before database calls. Other Prisma
versions/providers are not covered by that integration run.

## License

MIT
