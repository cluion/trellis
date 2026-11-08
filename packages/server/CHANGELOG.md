# @trellisjs/server

## 0.1.0-alpha.2

- Validate safe-integer pagination, offsets, sort criteria and filter structures.
- Require explicit sortable-column allowlists and reject unknown filter columns.
- Keep SQL values parameterized and document migration from `0.1.0-alpha.1`.

These changes introduce stricter validation and an explicit column authorization contract. See [the migration guide](./README.md#migration-from-010-alpha1).
