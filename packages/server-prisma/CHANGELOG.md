# @trellisjs/server-prisma

## Unreleased

- Add `withPrismaSnapshot(client, operation)` for a single RepeatableRead snapshot across counts and rows on MySQL/PostgreSQL.
- Reject contradictory counts and page lengths with `PrismaConsistencyError` instead of returning a response the frontend cannot accept.
- Add generated Prisma 7.10.1 client integration CI on MySQL 8.4.11 and PostgreSQL 18.6, including committed inserts, deletes and updates between reads.

These additions are available in the checkout only; the published `0.1.0-alpha.2` packages are unchanged.

## 0.1.0-alpha.2

- Require an explicit scalar `select` projection and separate searchable, filterable and sortable column allowlists.
- Reject unauthorized or malformed queries before database access.
- Follow provider collation by default; opt into `insensitive` mode only on supporting providers.
- Preserve multi-column ordering and filtered counts while applying validated pagination.

These changes introduce required adapter options. See [the migration guide](./README.md#migration-from-010-alpha1). Requires `@trellisjs/server@0.1.0-alpha.2` or a compatible later version.
