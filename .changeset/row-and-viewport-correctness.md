---
"@trellisjs/core": minor
"@trellisjs/plugin-virtual-scroll": patch
---

Prevent automatic row ID reuse and reject duplicate explicit IDs. Publish viewport metadata together with rows through TransformResult, and calculate virtual-scroll ranges from the current page, including remote pages, data shrinkage and query resets.

Release the core and virtual-scroll changes together; the workspace peer range resolves to the updated core when packing. Backend helper safety changes remain pending a separate alpha-only release.
