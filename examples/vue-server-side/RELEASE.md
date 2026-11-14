# Server-side 發布準備 — 2026-11-08

> 此頁保留當時的發布前驗證紀錄。PR #40、#42、#43 的相關版本現已發布；目前套件版本、安裝方式與瀏覽器驗收請見 [整合指南](./README.md#versions-and-release-status)。以下「待發布」等敘述只適用於當時的檢查時間。

本文件保留發布前的本機驗證，以及 [Changesets 版本 PR #40](https://github.com/cluion/trellis/pull/40) 合併前的核對紀錄。[功能 PR #39](https://github.com/cluion/trellis/pull/39) 已 squash 合併至 `main`，提交為 `1f624b700ea8403ed450afdf91e9c55abd91c330`。正式發布狀態以 [GitHub Releases](https://github.com/cluion/trellis/releases) 為準；官網整合需另行驗收。

## 變更與版本

功能提交：`2d527fa647100b9cfed99e3042beb6280858049a`（`feat: add automatic server-side datasource mode`）。包含遠端查詢、自動載入、後端總數、請求生命週期、Vue 範例、測試與 API 文件。

`pnpm changeset status --output` 確認以下公開套件的發布計畫：

| 套件 | 升版前 | 版本 PR 版號 |
| --- | --- | --- |
| `@trellisjs/core` | 1.12.0 | 1.13.0 |
| `@trellisjs/plugin-datasource` | 3.1.0 | 3.2.0 |
| `@trellisjs/plugin-filter` | 3.3.0 | 3.3.1 |
| `@trellisjs/plugin-sort` | 3.1.0 | 3.1.1 |
| `@trellisjs/plugin-pagination` | 3.1.0 | 3.1.1 |
| `@trellisjs/react` | 3.9.0 | 3.9.1 |

私人 `@trellisjs/demo` 由 0.1.23 升為 0.1.24，不會發布 npm。Vue adapter 維持 1.1.0。Changesets 已在版本 PR 中更新這七個套件的 manifest 與 CHANGELOG，並移除已消耗的 changeset；套件 manifest 除版號外沒有其他變更。

## 驗證證據

環境：既有 `trellis:app` 容器，Linux ARM64、Node 24.19.0、pnpm 9.15.4、TypeScript 5.9.3、Vitest 4.1.12。全套檢查在工具依賴修補後執行。

| 檢查 | 結果與範圍 |
| --- | --- |
| `pnpm install --frozen-lockfile --config.confirm-modules-purge=false` | 通過，確認 lockfile 可重現安裝 |
| `pnpm ci:check` | 通過全專案 build、ESLint、Prettier、型別與測試，共 20 組、585 項測試 |
| `pnpm audit` | 通過既有忽略政策；仍有 1 項既有低風險公告被忽略，未新增忽略項目 |
| `gitleaks git --redact --no-banner .` | 功能提交與既有 Git 歷史掃描通過 |
| 暫存差異的 gitleaks 掃描 | 提交前使用遮蔽模式檢查，避免將機密加入提交 |
| `verify-commit-subjects.sh` | 功能提交符合 Conventional Commit／English ASCII 主旨規範 |
| npm registry 唯讀檢查 | 六個預定版本在檢查當時皆回傳 404，尚未被發布；這不是版號保留 |

全套測試仍會出現既有 Vue missing-render 與 React DOM nesting／`act()` 警告；未出現測試失敗。

## 工具依賴修補

發布稽核發現三項既有中風險問題，已使用獨立變更修補：

- 私人 demo 的 Vite 改為 `^6.4.5`，處理 [GHSA-8g5g-mxqh-grgj](https://github.com/advisories/GHSA-8g5g-mxqh-grgj)。
- 針對 `js-beautify > glob` 使用 `14.0.2`，處理 [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)。
- 針對 `@typescript-eslint/typescript-estree > minimatch` 與 `editorconfig > minimatch` 使用 `11.0.1`，處理 [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)。

修補限制在開發工具依賴及其 lockfile；跨主要版本的間接依賴以明確的 parent selector 限定，並通過完整 CI 驗證。套件 metadata 仍宣告支援 Node 18；本次實際執行環境為 Node 24，尚未執行跨 Node 版本矩陣。

## 封裝與 consumer 演練

在獨立暫存副本套用 Changesets 預定版號，再對六個公開套件執行 `pnpm pack --json --pack-destination ...`。這是本機封裝演練；正式 GitHub changelog 產生流程與 npm trusted publishing 尚未執行。

- 六份 tarball 均包含 ESM、CJS 與兩種 declaration 入口。
- workspace／catalog 相依已轉為可發布的版本範圍；相關套件的 core peer range 為 `^1.13.0`。
- tarball 清單未包含私人 Context、機密設定、Git 資料或測試目錄。
- 全新 consumer 只使用解包後的六個套件，通過 ESM／CJS 載入及嚴格 TypeScript 檢查；React peer 使用本機已安裝版本。
- consumer 實際驗證初始查詢、跨頁搜尋／排序、遠端總數與 stop／start 流程。

## 遠端與版本 PR 核對

- 功能 PR #39 的遠端 CI 已通過，共 585 項測試，並已合併。
- 產生版本 PR 的 [Release run](https://github.com/cluion/trellis/actions/runs/42453169612) 已成功完成。
- 版本 PR 的六個公開版號及私人 demo 版號符合原定 Changesets 計畫，CHANGELOG 正確引用 PR #39 與其 squash 提交。
- changeset 被移除後，文件改用穩定的 PR／版本相容性連結，避免失效連結與過時的「尚未升版」說明。

## 後續發布關卡

1. 完成版本 PR #40 的 CI 與正式 manifest 封裝驗證。
2. 審查並授權合併版本 PR；合併將啟動 npm 發布，需另外核對公開套件、tag 與 GitHub Release。
3. 官網依[串接指南](./README.md)與 [Vue 範例](./UserTable.vue)接上實際後端，另做真實瀏覽器與後端整合驗收。

本機通過檢查不代表遠端 CI、npm 發布或官網整合已完成。
