# @trellisjs/server-prisma

## 0.1.0-alpha.2

- Require an explicit scalar `select` projection and separate searchable, filterable and sortable column allowlists.
- Reject unauthorized or malformed queries before database access.
- Follow provider collation by default; opt into `insensitive` mode only on supporting providers.
- Preserve multi-column ordering and filtered counts while applying validated pagination.

These changes introduce required adapter options. See [the migration guide](./README.md#migration-from-010-alpha1). Requires `@trellisjs/server@0.1.0-alpha.2` or a compatible later version.
