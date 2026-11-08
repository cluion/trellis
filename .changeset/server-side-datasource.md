---
'@trellisjs/core': minor
'@trellisjs/plugin-datasource': minor
'@trellisjs/plugin-filter': patch
'@trellisjs/plugin-sort': patch
'@trellisjs/plugin-pagination': patch
'@trellisjs/react': patch
---

Add automatic server-side queries using the existing TrellisQuery/TrellisResponse protocol, authoritative remote counts, initial queries, abort and stale-response protection, observable loading/errors, reload/retry/cancel events, GET query transformation and response validation. Keep client-side transforms unchanged, add resumable start/stop plugin lifecycle hooks, and stop React requests immediately on unmount with StrictMode support.
