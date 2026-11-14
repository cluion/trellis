# @trellisjs/server

## Unreleased

- Validate `buildResponse` counts, row objects, safe pagination and exact requested page lengths before constructing a response. Reject malformed results explicitly; preserve valid zero-result, final and out-of-range pages without clamping counts or changing the requested page.
- Add response-builder regressions and real HTTP datasource acceptance for full/final pages, zero matches, empty datasets and out-of-range requests.
- Quote authorized SQL identifiers so reserved names such as `order`, `group` and `select` work in filters and sorting.
- Add `SqlQueryOptions` / `SqlDialect`: SQLite defaults, MySQL and PostgreSQL identifier/parameter rendering, plus PostgreSQL parameter offsets for composed conditions.
- Make global and string-column searches literal contains searches by default, using parameterized patterns with `ESCAPE '!'`. Explicit `likeMode: 'wildcard'` enables `%` / `_` contains patterns.
- Reject NUL search text explicitly rather than allowing SQLite LIKE pattern truncation.
- Add executed SQLite/MySQL/PostgreSQL regressions for special characters, Unicode, authorization, parameter composition and unchanged filtered pagination.

These changes are not published in `0.1.0-alpha.2`; follow the migration notes before adopting a future backend release.

## 0.1.0-alpha.2

- Validate safe-integer pagination, offsets, sort criteria and filter structures.
- Require explicit sortable-column allowlists and reject unknown filter columns.
- Keep SQL values parameterized and document migration from `0.1.0-alpha.1`.

These changes introduce stricter validation and an explicit column authorization contract. See [the migration guide](./README.md#migration-from-010-alpha1).
