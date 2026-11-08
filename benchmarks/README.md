# Pipeline CPU benchmark

Build the workspace first (`make setup` for a clean checkout), then run inside the toolchain container:

```sh
docker compose --env-file docker/.env -f docker/compose.yaml run --rm app pnpm bench:pipeline
```

The deterministic fixture uses 10,000 and 50,000 rows, a 1,000-row page, a 400px viewport, 40px row height and overscan 5. A global search matches one tenth of the rows. The script measures filter changes, sort changes, forced combined recomputation and batches of 20 scroll events. Each scenario has two warmups and nine measured samples. The reported p95 is therefore the largest measured sample. Result counts, filter matches and sort order are checked outside the timed sections.

## Local reference — 2026-11-08 UTC

Node v24.19.0, Linux ARM64, identical fixture and samples. “Before” is the local P1 worktree before snapshot protection/cache; it is not a published package version. “After” includes both snapshot protection and viewport caching. The [recorded results](./results/pipeline-2026-11-08.json) include timing summaries and transform execution counts.

Median milliseconds:

| Rows | Scenario | Before P2 | After P2 |
| ---: | --- | ---: | ---: |
| 10,000 | Filter change | 1.262 | 1.615 |
| 10,000 | Sort change | 1.671 | 3.036 |
| 10,000 | Forced filter + sort | 0.921 | 1.766 |
| 10,000 | 20 scroll events | 19.079 | 0.245 |
| 50,000 | Filter change | 4.925 | 8.171 |
| 50,000 | Sort change | 10.728 | 17.176 |
| 50,000 | Forced filter + sort | 6.698 | 9.531 |
| 50,000 | 20 scroll events | 108.896 | 0.277 |

Scroll-batch p95 milliseconds:

| Rows | Before P2 | After P2 |
| ---: | ---: | ---: |
| 10,000 | 20.291 | 0.750 |
| 50,000 | 118.442 | 0.357 |

Across 220 warmup/measured scroll events, filter and sort ran 220 times each before the change and zero additional times after cache warmup. Legacy transforms without dependency declarations still execute. Explicit `recompute()` deliberately bypasses cache reuse.

Snapshot protection increases the cost of cold filter/sort work in this run; the viewport cache reduces repeated work while scrolling. Both effects are shown above. These CPU timings exclude table construction, browser rendering, network/database work and memory profiling. They do not establish UI frame rates, cross-platform performance or a comparison with DataTables. Repeat on the target workload before setting a performance budget.
