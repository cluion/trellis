# Vue server-side browser acceptance

This private fixture copies the repository's [`UserTable.vue`](../../../examples/vue-server-side/UserTable.vue) unchanged into `.generated/` at startup. Vite compiles it as a real Vue application. Chromium, Firefox and WebKit send native GET requests to a loopback Node HTTP server using an in-memory SQLite database and the real `@trellisjs/server` parser, SQL allowlists and response builder. No `fetch` stubs or Playwright API-route interception are used.

The fixture deliberately stays outside the pnpm workspace. Its independent `package-lock.json` pins the published npm packages and browser toolchain. No release or changeset is required for this test-only package.

## Run with Docker

From the repository root, with Docker running:

```sh
# Published npm consumer; installs the isolated fixture and runs all three browsers.
make e2e-vue

# Current checkout; installs/builds workspace packages before the same browser suite.
make e2e-vue E2E_PACKAGES=checkout
```

The browser image uses Node 24.19.0, pnpm 9.15.4 and the official Playwright 1.65.1 image. The [Dockerfile](../../../docker/Dockerfile.browser), [CI job](../../../.github/workflows/ci.yml) and `@playwright/test` version must stay aligned when upgrading. Playwright documents the matching-image requirement and container setup in its [Docker guide](https://playwright.dev/docs/docker).

These commands do not start or stop the existing demo, expose host ports or touch a user database. The backend binds container loopback port 4176 and Playwright always starts its own server; a conflicting listener fails the run rather than being reused. The database is disposable and `.generated/` is removed on shutdown. The `/__test/*` endpoints hold/release requests, inject errors and shrink the fixture dataset; this is test infrastructure and must not be deployed as an application backend.

If dependencies and browsers are already installed in a compatible environment, the underlying commands are:

```sh
npm ci --prefix tests/e2e/vue-server-side
npm --prefix tests/e2e/vue-server-side run typecheck
npm run test:e2e:vue
TRELLIS_E2E_PACKAGES=checkout npm run test:e2e:vue

# Run one browser or open a failure trace inside that environment:
npm run test:e2e:vue -- --project=chromium
cd tests/e2e/vue-server-side
npx playwright show-trace test-results/<failed-test>/trace.zip
```

`checkout` mode requires built workspace packages (`pnpm install --frozen-lockfile` and `pnpm build`). The Make target performs these steps in Docker. The published mode resolves public package exports and rejects workspace symlinks; the checkout mode aliases all seven Trellis packages, including the server helper, to the current build. Both use the isolated fixture's Vue runtime to avoid loading two Vue instances.

## Scenarios

Each browser runs eight cases, with one worker to isolate the backend control state:

| Case | Assertions |
| --- | --- |
| Initial query and cross-page operations | Initial page/size/sort, preserved `scope=active`, search/sort/page-size reset, filtered pages, total versus page length, last-page rows |
| Superseded request | Hold the first search, issue a newer search, confirm actual HTTP connection closure, release the old work and retain the newest rows |
| Explicit cancellation | Loading and disabled navigation, connection abort, preserved rows/counts, reload recovery |
| HTTP 503 | Friendly error without transport details, preserved page/data, retry of the same query |
| Invalid response counts | Validation error, preserved page/data, retry recovery |
| Zero matches | `filtered=0`, preserved `total`, empty rows, page 1 and disabled navigation |
| Out-of-range page | Delete fixture rows on page 7, observe an empty response, automatic refetch of page 2 and correct last-page rows |
| Vue disposal | Unmount during a held request, confirm abort, release old work and remount a fresh table |

The fixture contains 64 active and 6 inactive users. The preserved URL scope is applied before both counts, global search matches 32 east-domain users, and SQL returns only `id`, `name` and `email`. The server controls delays explicitly; tests wait for UI state and backend telemetry rather than using arbitrary sleeps. A cancelled real HTTP response cannot be delivered again; revision protection for custom transports that ignore abort is separately covered by the root integration tests.

Every case attaches package versions, Node version and backend query/response/abort records. Uncaught browser page errors fail the case. Failed cases retain screenshots, videos and traces; `test-results/results.json` and `playwright-report/index.html` summarize the run.

## CI and validation

The existing `Verify changes` workflow has two additional matrix jobs: `checkout` and `published`. Each runs all three browsers after the commit-policy check, independently of the existing toolchain verification job. CI permits one diagnostic retry; both persistent failures and flaky recovered tests fail the job. Reports and failure artifacts are uploaded even on test failure and retained for 14 days.

The GitHub container runs browsers as root, so that step uses `/root` as its home directory. GitHub's default `/github/home` mount belongs to the host runner UID; Firefox refuses to start as root with another user's home directory. The local Make target instead uses the host UID with the browser image's writable `/tmp` home.

Local validation — 2026-11-14, Linux ARM64, Node 24.19.0, Playwright 1.65.1, TypeScript 5.9.3, Vue 3.5.44 and Vite 7.3.7:

| Check | Result |
| --- | --- |
| `CI=1 make e2e-vue` | 24 passed: 8 cases × 3 browsers, public npm packages |
| `CI=1 make e2e-vue E2E_PACKAGES=checkout` | Frozen workspace install/build and 24 passed: 8 cases × 3 browsers, current builds |
| Combined browser results | 48 passed, 0 failed, 0 skipped, 0 flaky; no retries used |
| Root server-side integration and real HTTP regression | 19 passed |
| Existing Vue adapter/example regression | 61 passed |
| Isolated fixture TypeScript check | Passed in both modes |
| Changed code ESLint / Prettier / `git diff --check` | Passed |
| Workflow static validation | `actionlint` 1.7.12 passed |
| Isolated fixture npm install audit | 0 vulnerabilities reported |

The 80 regression tests are a scoped run, not a new full-monorepo test result. An existing missing-render Vue warning appeared in the context-error regression; the case passed. Local success does not mean the new GitHub Actions jobs have executed remotely; that requires a pushed branch/PR or workflow dispatch.

Scope: real desktop browser → HTTP → SQLite for the Vue example. This suite does not verify official website deployment, production authentication/CORS, MySQL/PostgreSQL in a browser, React browser behavior, mobile layout or performance. The backend alpha release's separate database acceptance is described by its release evidence; these browser tests do not replace it.
