---
"@trellisjs/core": minor
"@trellisjs/plugin-sort": minor
"@trellisjs/plugin-filter": minor
"@trellisjs/plugin-pagination": minor
---

引入 Transform Pipeline 架構，修復 sort + filter 插件互動問題

- Core 新增集中式 Transform Pipeline 引擎，持有唯一 sourceData
- 插件透過 registerTransform 註冊純轉換函式，移除各自的 originalData 快照
- 新增 registerTransform、recompute、updateSourceData 三個 API 方法
- 管線依 priority 執行：filter(10) → sort(20) → pagination(30)
- 修復：篩選後排序 → 清除排序保留篩選；排序後篩選 → 清除篩選保留排序
