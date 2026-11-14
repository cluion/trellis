# Prisma 7 real-database integration

This private fixture tests the current built `@trellisjs/server` SQL builders
and `@trellisjs/server-prisma` ESM/CJS entrypoints with generated Prisma
**7.10.1** clients and the official
`@prisma/adapter-mariadb` / `@prisma/adapter-pg` drivers. It stays outside the
pnpm workspace and pins its own npm lockfile. The package versions and npm
release channels are unchanged by this fixture.

## Run locally

From the repository root with Docker running and the existing toolchain image
available (`make build` creates it):

```sh
make test-prisma7
```

The target builds the relevant checkout packages, installs the locked fixture,
generates one client for each provider, pushes its schema, checks TypeScript
and runs the integration cases. The dedicated
[Compose project](../../../docker/compose.prisma-test.yaml) starts MySQL 8.4.11
and PostgreSQL 18.6, stores database files in tmpfs, exposes no host ports and
cleans up its containers/network on success or failure. It does not use the
existing demo or infrastructure databases. No `.env` is loaded; the credentials
are dummy values for these disposable databases. The Prisma config rejects any
database name other than `trellis_prisma7_test`.

After an interrupted Docker session, the cleanup command for this specific
test project is:

```sh
docker compose --env-file /dev/null -f docker/compose.prisma-test.yaml down
```

Reports remain in `tests/integration/prisma7/reports/`: `mysql.xml` and
`postgresql.xml` contain JUnit results, and provider environment JSON files
record the actual database, Prisma and Node versions. The generated client and
reports are Git-ignored. Type checking also verifies that the helper callback
receives a real generated transaction client, with neither arbitrary model
access nor root-client lifecycle methods.

## Consistency contract

`trellisPrismaQuery(model, query, options)` retains its delegate-based API. A
delegate alone does not create a snapshot. The new checkout API
`withPrismaSnapshot(rootClient, operation)` opens an interactive transaction
with **RepeatableRead** isolation for MySQL/PostgreSQL:

```ts
const result = await withPrismaSnapshot(prisma, (tx) =>
  trellisPrismaQuery(tx.user, query, options),
);
```

Use the provided `tx.user`; the outer `prisma.user` is a separate connection.
The helper requires the root client and rejects a transaction client, which
could inherit weaker isolation from its parent. It preserves the operation's
result type and propagates errors without replaying the callback. Client
timeout/max-wait settings still apply. Each request gets one snapshot; different
pagination requests are not pinned to the same database revision.

The adapter rejects contradictory counts/page lengths with
`PrismaConsistencyError`. This prevents an invalid envelope from reaching the
frontend, but a structurally valid response alone does not prove snapshot
consistency. Use the transaction helper, or manage a suitable transaction and
pass its delegate directly. No count clamping, automatic retry, provider
inference or new tenant-authorization mechanism is added.

`withPrismaSnapshot` and the consistency error/check are **unreleased**. The
published alpha.2 API can use the equivalent explicit
`prisma.$transaction(callback, { isolationLevel: 'RepeatableRead' })` pattern
shown in the [package guide](../../../packages/server-prisma/README.md#consistent-counts-and-rows).

## Real interleavings

There are separate reader and writer Prisma clients, each with a one-connection
pool. This also makes a leaked reader connection fail the subsequent snapshot
instead of being hidden by a spare pooled connection. A small wrapper
awaits an actual database `count`, commits a real writer operation through the
other client, and only then lets the remaining reader operations continue.
The counts and rows themselves always come from real Prisma queries; none are
stubbed, and there are no timing sleeps. Writer-side queries assert that the
change is committed while the reader still sees its original snapshot.

Each provider runs these twelve cases:

1. Projection, global/column search, sorting, pagination, zero/out-of-range and public HTTP response validation.
2. Column mapping and provider-specific case sensitivity.
3. Unauthorized columns/missing projection rejected before model queries.
4. The actual database reports RepeatableRead inside the transaction.
5. An existing ReadCommitted transaction cannot masquerade as a root client.
6. Insert between unfiltered and filtered counts; the snapshot retains original counts/rows.
7. Delete between filtered count and row query; the old last-page row remains visible in the snapshot.
8. Update search membership between counts; the snapshot retains matching rows while the writer observes zero matches.
9. Delete after the count of an unfiltered query; snapshot pagination remains valid.
10. Without a snapshot, committed insert/deletion races produce an explicit consistency error.
11. CommonJS uses the same transaction/response contract as ESM.
12. A callback failure propagates and releases the connection for the next query.

Representative snapshot responses go through a native loopback HTTP server and
the public datasource validator, checking the same count/page-length contract
as browser consumers. This is backend integration acceptance, not a browser
test or a production load benchmark.

## SQL helper regressions

The same disposable databases also execute `sql.integration.ts`. It uses the
real Prisma driver only as a parameterized SQL transport, exercising the built
SQL helper directly rather than Prisma's filter construction. A separate
mapped model creates actual columns named `order`, `group` and `select`.
`database.ts` shares the pinned driver setup with the snapshot suite.

Each provider has 21 SQL cases: global and column literal searches for `%`, `_`,
`!`, backslash, quotes, Unicode and combined special characters; combined
reserved-name search/filter/sort/pagination with counts; explicit wildcard
mode; preceding scope-parameter composition; numeric equality/empty filters;
parameterized SQL payloads/authorization; NUL-pattern rejection; and executed CommonJS clauses.
PostgreSQL uses numbered bindings, including the scope offset; MySQL uses `?`.
These cases are additional to the 12 snapshot/adapter cases above. Node's
in-memory SQLite SQL regressions run separately in the server package suite.

Literal versus wildcard matching is the SQL helper's explicit contract.
Database collation/case behavior is unchanged; Prisma adapter `contains`
filters are not rewritten by these SQL rendering options. See the
[SQL guide](../../../packages/server/README.md#sql-dialect-and-comparison-scope).

## CI and validation

The [Verify changes workflow](../../../.github/workflows/ci.yml) adds a
MySQL/PostgreSQL matrix. Each job starts a fresh database service with a health
check, uses Node 24.19.0, builds checkout packages, installs with `npm ci`,
generates the provider-specific Prisma 7 client and runs the type/integration
checks. The suite runs without automatic retries. Database service startup is
bounded by health checks and each job has a 15-minute timeout. Reports upload
even on failure and are retained for 14 days.

Earlier snapshot validation — 2026-11-14, Linux ARM64 and Node 24.19.0:

| Check | Result |
| --- | --- |
| Prisma 7.10.1 / MySQL 8.4.11 | 12 passed, 0 failed/skipped |
| Prisma 7.10.1 / PostgreSQL 18.6 | 12 passed, 0 failed/skipped |
| Generated client TypeScript checks | Both providers passed, including expected type-error cases |
| Server-Prisma unit/security/consistency tests | 34 passed |
| Real HTTP and backend release-guard regressions | 8 passed |
| ESM/CJS/declaration builds and adapter type check | Passed |
| Changed code ESLint/Prettier, `git diff --check`, actionlint 1.7.12 | Passed |
| Documentation local links | 48 resolved across four guides |
| Isolated fixture npm install audit | 0 vulnerabilities reported |

That snapshot run uses one reader connection and one independent writer
connection, including the error/reuse case. Both disposable databases and the
test network were removed on completion. These are scoped checks; the full
monorepo suite and Vue browser suite were not rerun for this backend change.
The workflow configuration is local until this branch is pushed; local Docker
success does not establish that a GitHub runner has passed.

Current SQL-stage validation — 2026-11-14, Linux ARM64 and Node 24.19.0:

| Check | Result |
| --- | --- |
| Server package (query validation, SQL contracts and executed SQLite) | 78 passed |
| MySQL 8.4.11 | 33 passed: 21 SQL + 12 snapshot/adapter cases |
| PostgreSQL 18.6 | 33 passed: 21 SQL + 12 snapshot/adapter cases |
| Generated client TypeScript and server ESM/CJS/declaration builds | Passed |
| Prisma adapter unit regression | 34 passed |
| Existing real HTTP and backend release-guard regression | 8 passed |
| Checkout Vue browser regression | 24 passed across Chromium, Firefox and WebKit, without retries |
| Changed code lint/format, workflow actionlint and local documentation links | Passed |

Both database legs use the final SQL implementation, including NUL rejection.
The server suite also reproduces SQLite's raw NUL truncation before verifying
that the builder rejects it. No full-monorepo run or new published-package
browser run was performed for this stage. The additional SQL cases are wired
into CI, but their remote execution awaits a pushed branch/PR.

This matrix validates Prisma 7.10.1 on the two listed providers. The earlier
Prisma 6.19.0 release checks are historical evidence, not another matrix leg.
Prisma 5/6/8, other providers, cross-request dataset stability, production
authentication/tenant policies and performance remain outside this run.
