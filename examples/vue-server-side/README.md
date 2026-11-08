# Server-side integration

This implementation keeps the existing `TrellisQuery` / `TrellisResponse` protocol. Install `createDatasourcePlugin()` alongside the usual sort, filter and pagination plugins. The datasource plugin selects server mode; omitting it preserves client-side behavior.

## Public API

```ts
import {
    createDatasourcePlugin,
    createRemoteDatasource,
} from '@trellisjs/plugin-datasource';

const remote = createDatasourcePlugin<User>({
    datasource: createRemoteDatasource<User>({
        url: '/api/users?scope=active',
        method: 'GET', // default: POST
    }),
    initialQuery: {
        page: 1,
        pageSize: 25,
        sort: [{ columnId: 'name', direction: 'asc' }],
        filter: { global: '', columns: {} },
    },
});
```

`initialQuery` is optional and accepts `Partial<TrellisQuery>`. Omitted fields use the table's initial query state (`pageSize` defaults to 10). Plugin order does not affect remote operation. Create a fresh plugin instance for each table.

```ts
interface TrellisQuery {
    page: number; // 1-based positive safe integer
    pageSize: number; // positive safe integer
    sort?: { columnId: string; direction: 'asc' | 'desc' }[];
    filter?: { global?: string; columns?: Record<string, unknown> };
}

interface TrellisResponse<T> {
    data: T[]; // current page only
    total: number; // before filtering
    filtered: number; // after filtering, before pagination
}

interface TrellisDatasource<T> {
    fetch(query: TrellisQuery, context?: { signal?: AbortSignal }): Promise<TrellisResponse<T>>;
}
```

Existing custom datasources with only `fetch(query)` remain compatible. Forward `context?.signal` to your transport to stop network work. The plugin also rejects stale results by request revision, even when a datasource ignores cancellation.

Use `data: []` when creating a remote table and a stable backend identifier for `rowId`. The datasource owns loaded rows. Row mutation APIs change local loaded data only; persist changes through your application API and emit `datasource:reload` afterwards. `Trellis` does not implement backend writes.

A standard POST body (GET uses the same fields, with JSON strings for `sort` / `filter`):

```json
{
  "page": 1,
  "pageSize": 10,
  "sort": [{ "columnId": "name", "direction": "asc" }],
  "filter": { "global": "example.com" }
}
```

The corresponding response can contain fewer than 10 rows when there are only two matches:

```json
{
  "data": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" }
  ],
  "total": 100,
  "filtered": 2
}
```

The first request runs automatically after all plugins are installed. Each query state change schedules a request; synchronous changes in one turn are coalesced into the newest query. Non-query state changes do not fetch. `createFilterPlugin({ searchDebounceMs: 250 })` can debounce search input. Search, column filters, sorting and page size changes reset the page to 1 in server mode, including updates through `api.setState()` / `api.recompute()`. Client-side page behavior is unchanged.

## Status, reload, retry and cancel

```ts
const unsubscribe = api.subscribe((state) => {
    const { loading, error, total, filtered } = state.datasource!;
    // Update the view; error is Error | null.
});

api.emit('datasource:reload'); // fetch the current query again
api.emit('datasource:retry'); // same operation, also works after cancellation
api.emit('datasource:cancel'); // abort active/queued work; loading=false, error=null
unsubscribe();
```

`state.datasource` is present when the plugin is installed and starts with `{ loading: false, error: null, total: 0, filtered: 0 }`. `loading` becomes true when a scheduled request starts. Errors remain available until the next request or explicit cancellation. Loading and failures preserve the last successful rows and counts, so use `loading` / `error` to indicate that the displayed results may belong to the previous successful query. Render a friendly UI message; avoid displaying raw transport errors to end users.

`state.pagination.totalItems` always uses the backend's `filtered`. `state.datasource.total` retains the unfiltered count. The filter, sort and pagination plugins skip local data operations in server mode. `api.getFilteredData()` returns only the loaded page in this mode; it cannot export all remote matches.

Zero results use page 1 and a single empty page for navigation. An out-of-range response must contain no rows. The plugin updates the counts, clears invalid page rows, corrects to the last available page (or page 1 for zero results), and automatically fetches that corrected page. It never relabels an old page's rows as the corrected page.

Vue disposes subscriptions and aborts requests on scope disposal. React starts external work in the mount effect and immediately stops requests during effect cleanup, preventing a response already queued in a microtask from applying after unmount. Final destruction occurs in the microtask following a real unmount, allowing StrictMode effect replay to restart the same instance. Framework-free consumers call `trellis.destroy()`. Advanced adapters can use `new Trellis({ ...options, autoStart: false })`, `trellis.start()` when mounted and `trellis.stop()` during cleanup; plugin `start` / `stop` hooks manage resumable resources.

## HTTP and response validation

POST sends `transformQuery(query)` (or the original query) as JSON. GET also uses the transformed result: return a plain key/value object. Scalars become strings, objects/arrays become JSON strings, and `undefined` properties are omitted. Query keys replace same-name URL parameters; other existing parameters, repeated parameters and URL fragments are retained.

```ts
createRemoteDatasource<User>({
    url: '/api/users?scope=active',
    method: 'GET',
    transformQuery: (query) => ({
        offset: (query.page - 1) * query.pageSize,
        limit: query.pageSize,
        sort: query.sort,
        filter: query.filter,
    }),
});
```

With default GET encoding, `page` / `pageSize` are strings and `sort` / `filter` are JSON strings, compatible with `@trellisjs/server` query parsing. `transformResponse` is generic and maps custom HTTP responses to `TrellisResponse<T>` before validation.

Both HTTP responses and custom datasource results are validated:

- `data` must be an array of non-null row objects.
- Counts must be non-negative safe integers with `filtered <= total`.
- `data.length` must equal `min(pageSize, max(0, filtered - (page - 1) * pageSize))`. Partial pages are valid only at the end; a backend that silently caps page size must instead honor the requested size or reject it.
- Pages, sizes and calculated offsets must be safe integers; page and size must be positive.

HTTP status, network, JSON, transform and validation errors reject a direct `datasource.fetch()` call; plugin-managed requests expose them through `state.datasource.error`. Invalid initial page/size configuration throws during construction. Cancellation through the plugin is not reported as an error.

## Vue example

Copy [`UserTable.vue`](./UserTable.vue) into a Vue 3 application and provide `GET /api/users` using the protocol above. It includes search, sorting, pagination, page size, loading, cancellation and error retry. `useTrellis()` returns the existing reactive `state` ref; no framework-specific request controller is needed.

## Versions and release status

This is an unreleased local change. Package manifests retain their current versions; the changeset proposes the versions below. Do not assume npm already contains these APIs.

| Package | Current manifest | Proposed next release |
| --- | --- | --- |
| `@trellisjs/core` | 1.12.0 | 1.13.0 |
| `@trellisjs/plugin-datasource` | 3.1.0 | 3.2.0 |
| `@trellisjs/plugin-filter` | 3.3.0 | 3.3.1 |
| `@trellisjs/plugin-sort` | 3.1.0 | 3.1.1 |
| `@trellisjs/plugin-pagination` | 3.1.0 | 3.1.1 |
| `@trellisjs/react` | 3.9.0 | 3.9.1 |
| `@trellisjs/vue` | 1.1.0 | unchanged; use with the updated core/plugins |

Release these core and plugin updates together. The existing Vue adapter binds the shared core state without a new API.

The [pending changeset](../../.changeset/server-side-datasource.md) records release intent. Package versions and generated changelogs have not been advanced; the release workflow will generate them when the versioning change is applied. No publish has been performed.

## Validation — 2026-11-08

| Requested behavior | Verification |
| --- | --- |
| Server-only query operations with preserved client-side behavior | Remote authoritative-order test and existing client-side sort/filter/pagination suites |
| Automatic first load, initial query and page resets on condition changes | Initial-query/plugin-order tests, direct state-update test and cross-page query tests |
| Backend `filtered` pages, retained `total`, zero and out-of-range pages | Remote-count tests, zero-result test and corrected-page refetch test |
| Observable loading/errors, reload/retry, cancellation, stale protection and disposal | Lifecycle integration tests, React StrictMode/unmount-race test and Vue disposal test |
| GET transforms, merged URL parameters and response/count validation | HTTP datasource tests plus real loopback GET/POST, HTTP 503 retry and connection-cancellation tests |
| Shared request logic with Vue/React binding and a Vue example | Core/datasource implementation, both adapter suites and the compiled/mounted Vue SFC example |

Verified locally with the existing `trellis:app` Docker image on Linux ARM64, Node 24.19.0, TypeScript 5.9.3, Vitest 4.1.12 and Vue 3.5.44. No external network was used; real HTTP tests use the container's loopback interface.

| Scope | Passing tests |
| --- | ---: |
| Root integration (server-side, real HTTP and existing client-side) | 24 |
| Core | 102 |
| Datasource | 52 |
| Filter | 36 |
| Sort | 16 |
| Pagination | 8 |
| React | 65 |
| Vue (including the actual `UserTable.vue`) | 61 |
| **Total** | **364** |

Coverage includes initial queries and plugin order, cross-page search/sort/filter, page-size resets, authoritative counts, stale successes and failures, cancellation before dispatch and during requests, retry/reload, zero results, out-of-range refetching, response validation including sparse arrays, disposal, stop/restart, React StrictMode and existing client-side regressions. The unmount race regression explicitly resolves a request immediately before unmount and verifies immediate abort and unchanged rows.

All seven relevant packages passed ESM/CJS/declaration builds and `tsc --noEmit`. Changed TypeScript files passed ESLint; changed code and the Vue SFC passed Prettier checks. Markdown is excluded by the repository's `.prettierignore`; documentation is checked through local links, example types and response contracts instead. The example's script also passed strict TypeScript checking against the built public declarations with zero diagnostics. `git diff --check` passed.

The Vue example was compiled and mounted in jsdom, with interactions issuing GET requests through a mocked HTTP transport and a local in-memory backend. Separate tests use a real Node HTTP server, native fetch and `@trellisjs/server` query parsing to verify GET search/sort/pagination, POST JSON, HTTP 503 retry and cancellation of an unfinished connection. These checks are not a real-browser or official website/backend integration acceptance. The unrelated monorepo suites were not run. Existing Vue missing-render and React DOM-nesting/`act()` test warnings were observed in their existing test cases; all tests passed.

Documentation was checked across 11 related README/guide files: 47 local links resolved and 13 complete TypeScript/React/Vue examples passed strict checking against the built public declarations. The JSON request/response example passed the actual datasource validator. The SQL handler excerpt was executed against an in-memory SQLite dataset: 28 unfiltered rows, 12 matches, and 3 rows on page 2 (`9, 8, 7`), confirming that `filtered` is counted independently from the page length. These were documentation-only checks; the 364-test implementation result above comes from the preceding implementation verification, not another full test run.

To repeat the scoped tests in the repository's Linux toolchain:

```sh
pnpm exec vitest run
pnpm -r --filter @trellisjs/core --filter @trellisjs/plugin-datasource --filter @trellisjs/plugin-filter --filter @trellisjs/plugin-sort --filter @trellisjs/plugin-pagination --filter @trellisjs/react --filter @trellisjs/vue run test
```
