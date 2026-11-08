---
"@trellisjs/core": minor
"@trellisjs/plugin-virtual-scroll": patch
"@trellisjs/plugin-filter": patch
"@trellisjs/plugin-sort": patch
"@trellisjs/plugin-pagination": patch
---

Protect table-owned state containers and row metadata with copied immutable snapshots, including readonly Set operations, while preserving original row payload and framework render-value ownership. Cache explicitly declared transform dependencies during recomputeView(), keep legacy transforms uncached, and retain recompute() as a forced refresh.

Filter/sort/pagination declare their dependencies and virtual scrolling reuses their results. Add a reproducible 10,000/50,000-row core CPU benchmark, including the cold-query cost of snapshot protection.
