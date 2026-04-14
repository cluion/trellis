---
"@trellisjs/core": minor
---

Add `addRow`, `removeRow`, `updateRow` methods to TrellisAPI for dynamic data manipulation. Each method modifies `sourceData` and re-runs the Transform Pipeline, so sort/filter/pagination update automatically. Emits `data:added`, `data:removed`, `data:updated` events respectively.
