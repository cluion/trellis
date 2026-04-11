# @trellisjs/server-prisma

One-line Prisma adapter for Trellis queries -- convert a `TrellisServerQuery`
into fully resolved Prisma operations and get back a standard response.

## Installation

```bash
npm install @trellisjs/server-prisma @trellisjs/server @prisma/client
```

Requires `@prisma/client` >= 5.

## API

### `trellisPrismaQuery<T>(model, query, options?)`

Executes a Trellis query against a Prisma model and returns paginated results.

**Parameters:**

- `model` -- a Prisma delegate (e.g. `prisma.user`).
- `query` -- a `TrellisServerQuery` from `@trellisjs/server`.
- `options` (optional):
  - `searchableColumns` -- column names included in global search (`OR` with
    case-insensitive `contains`).
  - `columnMap` -- maps Trellis column IDs to different Prisma field names.

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
    searchableColumns: ['name', 'email'],
  });
  res.json(result);
});
```

## License

MIT
