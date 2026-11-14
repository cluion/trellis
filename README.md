# Trellis

Modern headless datatable engine — TypeScript, plugin-based, full-stack ready.

Trellis is a framework-agnostic data table library with a plugin architecture, immutable state management, and a standardized query protocol for front-end and back-end integration.

## Features

- **Headless** — No UI, no CSS, no opinions. Bring your own components.
- **Plugin Architecture** — Sort, filter, paginate, fetch remote data — each is an independent plugin.
- **TypeScript Native** — Full generic support `Trellis<T>`, type-safe throughout, including event payloads.
- **Immutable State** — Every state change produces a new frozen snapshot.
- **EventBus** — Isolated event listeners; one error won't crash others.
- **Slot System** — Named rendering slots for complete UI customization.
- **Full-Stack Protocol** — `TrellisQuery / TrellisResponse` unifies frontend and backend interfaces.
- **Server Helpers** — Query parsing, SQL construction, and ORM adapters.
- **Server-Side Tables** — Automatic datasource requests, remote totals, loading/errors, cancellation and retries. See the [API guide and Vue example](./examples/vue-server-side/README.md).
- **Tree-Shakeable** — Install only the plugins you need.
- **React & Vue Adapters** — Components and hooks for React (`@trellisjs/react`) and Vue 3 (`@trellisjs/vue`), including sticky header.

## Packages

| Package | Description |
|---------|-------------|
| [`@trellisjs/core`](./packages/core) | Core engine — state, plugins, slots, events |
| [`@trellisjs/plugin-sort`](./packages/plugin-sort) | Column sorting (asc/desc) |
| [`@trellisjs/plugin-filter`](./packages/plugin-filter) | Global text search and per-column filtering with independent debounce |
| [`@trellisjs/plugin-pagination`](./packages/plugin-pagination) | Page navigation and page size |
| [`@trellisjs/plugin-datasource`](./packages/plugin-datasource) | Remote API data fetching |
| [`@trellisjs/plugin-selection`](./packages/plugin-selection) | Row selection (single, multi, range) |
| [`@trellisjs/plugin-column-visibility`](./packages/plugin-column-visibility) | Dynamic column show/hide |
| [`@trellisjs/plugin-column-pinning`](./packages/plugin-column-pinning) | Pin columns to left/right with CSS sticky |
| [`@trellisjs/plugin-column-resizing`](./packages/plugin-column-resizing) | Column resizing — drag to resize with min/max constraints |
| [`@trellisjs/plugin-state-save`](./packages/plugin-state-save) | Persist UI state to browser storage, auto-restore on reload |
| [`@trellisjs/plugin-row-expansion`](./packages/plugin-row-expansion) | Expand rows to show custom detail content |
| [`@trellisjs/plugin-export-csv`](./packages/plugin-export-csv) | CSV export — browser download or get string |
| [`@trellisjs/plugin-clipboard`](./packages/plugin-clipboard) | Clipboard copy/paste as TSV, integrates with Excel and Google Sheets |
| [`@trellisjs/plugin-inline-edit`](./packages/plugin-inline-edit) | Inline cell editing with validation, keyboard navigation (Tab/Enter/Escape) |
| [`@trellisjs/plugin-virtual-scroll`](./packages/plugin-virtual-scroll) | Virtual scrolling for large datasets |
| [`@trellisjs/react`](./packages/react) | React hooks and components |
| [`@trellisjs/vue`](./packages/vue) | Vue 3 composables and components |
| [`@trellisjs/server`](./packages/server) | Backend query parser and SQL builder |
| [`@trellisjs/server-prisma`](./packages/server-prisma) | Prisma ORM adapter |

## Quick Start

### Install

```bash
npm install @trellisjs/core @trellisjs/react @trellisjs/plugin-sort @trellisjs/plugin-filter @trellisjs/plugin-pagination @trellisjs/plugin-selection @trellisjs/plugin-column-visibility
```

### React Example

```tsx
import { useTrellis } from '@trellisjs/react';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import type { ColumnDef } from '@trellisjs/core';

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

const columns: ColumnDef<User>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'age', accessor: 'age', header: 'Age' },
];

function UserTable({ data }: { data: User[] }) {
  const { api } = useTrellis<User>({
    data,
    columns,
    plugins: [
      createSortPlugin(),
      createFilterPlugin(),
      createPaginationPlugin(),
    ],
  });

  const state = api.getState();
  const sort = state.sorting.sortBy[0];

  const toggleSort = (columnId: string) => {
    const direction = sort?.columnId === columnId && sort.direction === 'asc' ? 'desc' : 'asc';
    api.emit('sort:change', { columnId, direction });
  };

  return (
    <div>
      <input
        placeholder="Search..."
        onChange={(e) => api.emit('filter:change', { query: e.target.value })}
      />
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.id} onClick={() => toggleSort(col.id)}>
                {String(col.header)} {sort?.columnId === col.id ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.data.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.id}>{String(row.original[col.accessor as keyof User] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Vue Example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useTrellis, TlTable } from '@trellisjs/vue';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';

interface User { id: number; name: string; email: string }
const columns = [
  { id: 'name', accessor: 'name' as const, header: 'Name' },
  { id: 'email', accessor: 'email' as const, header: 'Email' },
];
const users = ref<User[]>([]); // reassigning or pushing rows updates the table

const { api } = useTrellis({
  data: users,
  columns,
  plugins: [createSortPlugin(), createFilterPlugin(), createPaginationPlugin()],
});
</script>

<template>
  <input
    placeholder="Search..."
    @input="api.emit('filter:change', { query: ($event.target as HTMLInputElement).value })"
  />
  <TlTable sticky-header />
</template>
```

### Core-Only (No UI Framework)

```typescript
import { Trellis } from '@trellisjs/core';
import { createSortPlugin } from '@trellisjs/plugin-sort';

const trellis = new Trellis({
  data: [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
  ],
  columns: [
    { id: 'name', accessor: 'name', header: 'Name' },
    { id: 'age', accessor: 'age', header: 'Age' },
  ],
  plugins: [createSortPlugin()],
});

// Subscribe to state changes
trellis.api.subscribe((state) => {
  console.log('Data updated:', state.data);
});

// Sort by age descending
trellis.api.emit('sort:change', { columnId: 'age', direction: 'desc' });
```

### Server-Side Tables

Install `createDatasourcePlugin({ datasource, initialQuery })` alongside the existing filter, sort and pagination plugins. They update query state while the backend searches, sorts and paginates. Observe `state.datasource` for loading/errors and remote counts; use `datasource:reload`, `datasource:retry` and `datasource:cancel` commands.

The [integration guide](./examples/vue-server-side/README.md) contains the public API, GET/POST contract, zero/out-of-range behavior, published package versions and validation results. The complete [Vue SFC example](./examples/vue-server-side/UserTable.vue) demonstrates the UI flow. The [browser acceptance suite](./tests/e2e/vue-server-side/README.md) runs this exact example against a real HTTP/SQLite backend in Chromium, Firefox and WebKit, using both the current checkout and isolated public npm packages.

### Backend (Node.js)

```typescript
import { parseTrellisQuery } from '@trellisjs/server';
import { trellisPrismaQuery } from '@trellisjs/server-prisma';
import { prisma } from './db'; // Your application's configured Prisma client.

// In your API handler:
app.get('/api/users', async (req, res) => {
  const query = parseTrellisQuery(req.query);
  const result = await prisma.$transaction(
    (tx) => trellisPrismaQuery(tx.user, query, {
      select: { id: true, name: true, email: true },
      searchableColumns: ['name', 'email'],
      filterableColumns: ['name', 'email'],
      sortableColumns: ['id', 'name', 'email'],
    }),
    { isolationLevel: 'RepeatableRead' },
  );
  res.json(result);
});
```

The `./db` import represents your application's generated Prisma client; Prisma 7
needs a provider driver adapter. The [Prisma integration guide](./packages/server-prisma/README.md#consistent-counts-and-rows)
explains snapshot reads, the unreleased convenience API and the real-database CI.
The transaction example above works with the published alpha adapter.
The Prisma helper requires trusted output and query-field allowlists. String
search follows database collation by default; PostgreSQL callers can opt into
`stringFilterMode: 'insensitive'`. See the [Prisma migration guide](./packages/server-prisma/README.md#migration-from-010-alpha1)
and [SQL helper migration guide](./packages/server/README.md#migration-from-010-alpha1).
The SQL helper's [unreleased dialect/LIKE contract](./packages/server/README.md#sql-dialect-and-comparison-scope)
adds reserved-name quoting and literal contains matching. Executed regressions
cover SQLite/MySQL/PostgreSQL SQL semantics; Prisma filtering retains
its own provider-defined `contains` behavior.
These backend helper changes are included in `0.1.0-alpha.2`. Install
`@trellisjs/server@alpha` and `@trellisjs/server-prisma@alpha` to use them;
`latest` remains on the earlier API. See the
[backend release-channel policy](./.changeset/README.md#backend-alpha-channel).

## Architecture

```
@trellisjs/core              ← State management, plugin system, events, slots
  ├── plugin-sort            ← Independent sorting plugin
  ├── plugin-filter          ← Independent filtering plugin
  ├── plugin-pagination      ← Independent pagination plugin
  ├── plugin-datasource      ← Remote data fetching plugin
  ├── plugin-selection       ← Row selection plugin
  ├── plugin-column-visibility ← Column visibility plugin
  ├── plugin-column-pinning  ← Column pinning plugin
  ├── plugin-column-resizing ← Column resizing plugin
  ├── plugin-state-save      ← State persistence plugin
  ├── plugin-row-expansion   ← Row expansion plugin
  ├── plugin-export-csv      ← CSV export plugin
  ├── plugin-clipboard       ← Clipboard copy/paste plugin
  ├── plugin-inline-edit     ← Inline cell editing plugin
  ├── plugin-virtual-scroll  ← Virtual scrolling plugin
  ├── react                  ← React adapter (useTrellis hook)
  └── vue                    ← Vue 3 adapter (useTrellis composable)

@trellisjs/server            ← Backend query parser
  └── server-prisma          ← Prisma ORM adapter
```

Each plugin:
1. Implements `TrellisPlugin` interface (`name`, `install`, optional `start`, `stop`, `destroy`)
2. Receives `TrellisAPI` during installation
3. Registers data transforms via `api.registerTransform()` and re-runs them via `api.recompute()`
4. Communicates via `api.emit()` / `api.on()` events
5. Can register rendering slots via `api.registerSlot()`

## Development

Only Docker is required on the host. Node.js, pnpm, ESLint, Prettier and gitleaks all run inside the toolchain container defined in [`docker/`](docker); do not run `pnpm` on the host, because `node_modules` is installed for Linux by the container. Browser acceptance uses the separate, version-matched Playwright container described in the [E2E guide](./tests/e2e/vue-server-side/README.md).

```bash
cp docker/.env.example docker/.env   # on macOS/Linux, set PUID/PGID to `id -u` / `id -g`
make build                           # build the toolchain image
make setup                           # pnpm install + build all packages
make up                              # tsup --watch for every package + demo at http://127.0.0.1:5173
make down
```

Common commands:

```bash
make test         # run the root integration tests (tests/) and all package tests
make lint         # ESLint --fix + Prettier --write
make ci           # build, lint, format, type check and tests (same gate as CI)
make audit        # pnpm audit of all dependencies
make secret-scan  # gitleaks over the git history
make e2e-vue      # Vue + real HTTP/SQLite in Chromium, Firefox and WebKit (npm packages)
make e2e-vue E2E_PACKAGES=checkout # same browser suite using current workspace builds
make test-prisma7 # generated Prisma 7 clients, isolated MySQL/PostgreSQL and concurrent writes
```

Anything else runs through the `app` service, for example creating a changeset:

```bash
docker compose --env-file docker/.env -f docker/compose.yaml run --rm app pnpm changeset
```

Rerun `make setup` after the lockfile changes.

Development-tool security updates use scoped `pnpm.overrides`: `js-beautify > glob` is pinned to `14.0.2`, and `@typescript-eslint/typescript-estree > minimatch` / `editorconfig > minimatch` are pinned to `11.0.1`. These resolve the [glob cancellation advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and [minimatch amplification advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) while upstream packages still request the affected major versions. The private demo requires Vite `^6.4.5` for the [Vite development-server advisory](https://github.com/advisories/GHSA-8g5g-mxqh-grgj). The overrides are limited to tooling dependencies and are validated by the full CI gate.

`pnpm.auditConfig.ignoreGhsas` in `package.json` lists advisories with no usable fix:

- `GHSA-vfj7-8cjw-p6xm` (braces) and `GHSA-hp3w-g68c-fv3c` (sprintf-js): no patched release; both come from `@changesets/cli` processing repository files.
- `GHSA-g7r4-m6w7-qqqr` (esbuild): only affects esbuild's development server on Windows, which tsup does not use; the fix needs tsup 9 (Node.js ≥ 22.18).

## CI and Branch Flow

```text
feat/* · fix/* ──PR squash──▶ main ──▶ changesets release PR ──▶ npm
```

- Work on a short-lived `feat/*`, `fix/*`, `refactor/*`, `docs/*` or `chore/*` branch, open a PR to `main`, squash-merge it and delete the branch.
- Commits use Conventional Commits with English (ASCII) subjects. The PR title becomes the squash commit subject, so it follows the same rule.
- [`ci.yml`](.github/workflows/ci.yml) runs on PRs to `main` and on manual dispatch, not on pushes to `main`. It checks commit subjects and the PR title, then runs `make audit`, `make secret-scan` and `make ci` in the toolchain container. Two additional jobs run the Vue server-side browser suite against checkout builds and public npm packages; failure traces, screenshots, videos and HTML/JSON reports are retained for 14 days.
- [`dependency-audit.yml`](.github/workflows/dependency-audit.yml) repeats the audit every Monday 09:00 (Asia/Taipei).
- The same verification workflow also runs [Prisma 7 real-database tests](./tests/integration/prisma7/README.md) on MySQL and PostgreSQL, with committed writes interleaved between count/page reads and JUnit/environment reports retained for 14 days.
- [`release.yml`](.github/workflows/release.yml) runs on pushes to `main` and publishes through changesets with npm trusted publishing.

## Status

`@trellisjs/core`, the React and Vue adapters and the plugins are stable (1.x and above). `@trellisjs/server` and `@trellisjs/server-prisma` are still in **alpha**: the safety fixes are published as `0.1.0-alpha.2` on the `alpha` tag; `latest` remains `0.1.0-alpha.1`. See [GitHub issues](https://github.com/cluion/trellis/issues) for planned features.

## License

MIT
