## 1. Monorepo 基礎建設

- [x] 1.1 建立根目錄 package.json（trellis-monorepo workspace）、pnpm-workspace.yaml、.gitignore、.npmrc，執行 pnpm install，提交
- [x] 1.2 建立共用 tsconfig.base.json（ES2020、strict、bundler moduleResolution），提交
- [x] 1.3 建立 @trellisjs/core 套件骨架（package.json、tsconfig.json、tsup.config.ts、vitest.config.ts、src/index.ts），安裝依賴並驗證建構通過，提交

## 2. 核心目型別定義

- [x] 2.1 撰寫 ColumnDef 和 DataRow 型別煙霧測試（types.test.ts），建立 column.ts（ColumnDef、ColumnSortFn）和 data.ts（DataRow、DataId），更新 types/index.ts 和 src/index.ts 匯出，測試通過，提交
- [x] 2.2 撰寫 TableState 型別測試，建立 state.ts（SortState、FilterState、PaginationState、TableState），更新匯出，測試通過，提交
- [x] 2.3 撰寫 Plugin/Slot/Event 型別測試，建立 event.ts（EventHandler）、slot.ts（SlotRenderer、SlotContext）、plugin.ts（TrellisAPI、TrellisPlugin、TrellisOptions），更新匯出，驗證建構成功，提交

## 3. 核心引擎 — EventBus 與 StateStore

- [x] 3.1 撰寫 EventBus 完整測試（9 個：訂閱/多重監聽/取消訂閱/clear/重複註冊/錯誤隔離/無監聽器不報錯等），確認測試失敗
- [x] 3.2 實作 EventBus（event-bus.ts：on/off/emit/clear，Map<string, Set<Handler>>），建立 event/index.ts 匯出，測試全部通過，提交
- [x] 3.3 撰寫 StateStore 完整測試（10 個：初始狀態/不可變更新/部分更新/陣列替換/訂閱通知/取消訂閱等），確認測試失敗
- [x] 3.4 實作 StateStore（store.ts：getState/setState/subscribe，Object.freeze 快照），建立 state/index.ts 匯出，全部測試通過，提交

## 4. 核心引擎 — SlotRegistry、PluginManager、Trellis 主類別

- [x] 4.1 撰寫 SlotRegistry 測試（7 個：註冊/取得/has/unregister/render/覆寫/未註冊），確認失敗
- [x] 4.2 實作 SlotRegistry（slot-registry.ts：register/get/has/render，Map<string, SlotRenderer>），建立 slot/index.ts 匯出，測試通過，提交
- [x] 4.3 撰寫 PluginManager 測試（8 個：註冊/重複名稱/get/unregister/destroyAll/無 destroy 安全/未知插件等），確認失敗
- [x] 4.4 實作 PluginManager（plugin-manager.ts：register/unregister/destroyAll，Map<string, TrellisPlugin>），建立 plugin/index.ts 匯出，測試通過，提交
- [x] 4.5 撰寫 Trellis 主類別測試（14 個：初始化/狀態管理/插件系統/事件匯流排/插槽系統/銷毀/rowId 函式/rowId 鍵），確認失敗
- [x] 4.6 實作 Trellis 主類別（trellis.ts：組合 EventBus + StateStore + SlotRegistry + PluginManager，暴露 TrellisAPI），更新 src/index.ts 匯出所有子系統和型別，全部測試通過，建構驗證，提交

## 5. React 適配器

- [x] 5.1 建立 @trellisjs/react 套件骨架（package.json、tsconfig.json、tsup.config.ts、vitest.config.ts、src/index.ts），安裝依賴，建構驗證，提交
- [x] 5.2 撰寫 useTrellis hook 測試（5 個：建立實例/穩定 API 參照/狀態變更重渲染/卸載清理/插件安裝），確認失敗
- [x] 5.3 實作 TrellisContext（context.tsx：createContext + useTrellisContext）和 useTrellis hook（use-trellis.ts：useRef 建立/subscribe 觸發 setState 重渲染/unmount destroy），測試通過，提交
- [x] 5.4 撰寫 Table 元件測試（5 個：渲染 table/表頭/資料列/列數/欄數），確認失敗
- [x] 5.5 實作 Table 元件群（table.tsx、thead.tsx、tbody.tsx、tr.tsx、th.tsx、td.tsx），測試通過，提交
- [x] 5.6 撰寫 SlotRenderer 測試（4 個：已註冊渲染/fallback 渲染/未註冊空內容/context 傳遞），確認失敗
- [x] 5.7 實作 SlotRenderer（slot-renderer.tsx），更新 src/index.ts 匯出所有模組，全部 React 測試通過，建構驗證，提交

## 6. 插件 — 排序、篩選、分頁

- [x] 6.1 建立 @trellisjs/plugin-sort、plugin-filter、plugin-pagination 三個套件骨架（package.json、tsconfig、tsup、vitest），pnpm install，提交
- [x] 6.2 撰寫排序插件測試（8 個：字串升序/降序、數字排序、日期排序、狀態更新、自訂 sortFn、清除排序、sortable:false），確認失敗
- [x] 6.3 實作排序插件（sort-plugin.ts：compareValues 自動偵測型別、getCellValue 解析、sort:change 事件處理），測試通過，提交
- [x] 6.4 撰寫篩選插件測試（7 個：全域搜尋、不分大小寫、跨欄搜尋、數值搜尋、清除篩選、狀態更新、無篩選回傳全部），確認失敗
- [x] 6.5 實作篩選插件（filter-plugin.ts：filter:change 事件處理、跨欄模糊搜尋），測試通過，提交
- [x] 6.6 撰寫分頁插件測試（8 個：初始分頁、下一頁、上一頁、跳頁、邊界保護、每頁筆數變更），確認失敗
- [x] 6.7 實作分頁插件（pagination-plugin.ts：applyPagination 切割、事件處理、邊界保護），測試通過，全部套件測試通過，全部建構成功，提交

## 7. Server-side 資料源

- [x] 7.1 建立 @trellisjs/plugin-datasource 套件骨架，定義 TrellisQuery / TrellisResponse / TrellisDatasource / RemoteDatasourceOptions 型別（types.ts），撰寫型別測試，提交
- [ ] 7.2 撰寫靜態資料源測試（9 個：全量回傳、分頁、第二頁、最後一頁、排序、全域搜尋、排序+篩選、超頁範圍、columnAccessors），確認失敗
- [ ] 7.3 實作靜態資料源（static-datasource.ts：本地排序/篩選/分頁），測試通過，提交
- [ ] 7.4 撰寫遠端資料源測試（9 個：POST 請求、JSON body、回應解析、GET 方法、自訂 headers、transformQuery、transformResponse、HTTP 錯誤、網路錯誤），確認失敗
- [ ] 7.5 實作遠端資料源（remote-datasource.ts：fetch POST/GET、transformQuery/transformResponse 鉤子、錯誤處理），測試通過，提交

## 8. 後端 Helper 庫

- [ ] 8.1 建立 @trellisjs/server 套件骨架，撰寫查詢解析器測試（parseQuery：JSON body/URL query string/預設值/page 驗證/pageSize 驗證/上限；buildWhereClause：全域 OR/單欄 AND/無篩選；buildOrderByClause：單一/多重/無排序/SQL injection），確認失敗
- [ ] 8.2 實作查詢解析器（query-parser.ts：parseTrellisQuery/buildWhereClause/buildOrderByClause，SAFE_COLUMN_RE 安全驗證）、回應建構器（response-builder.ts：buildResponse），測試通過，提交
- [ ] 8.3 建立 @trellisjs/server-prisma 套件骨架，撰寫 Prisma 轉接器測試（基本查詢/排序/全域搜尋/單欄篩選/skip 計算），確認失敗
- [ ] 8.4 實作 Prisma 轉接器（prisma-adapter.ts：trellisPrismaQuery，Prisma findMany/count + orderBy + where），全部套件測試通過，全部建構成功，提交

## 9. 整合驗證

- [ ] 9.1 執行 monorepo 全部測試（pnpm test），確認所有套件測試通過
- [ ] 9.2 執行 monorepo 全部建構（pnpm build），確認所有套件建構成功
- [ ] 9.3 確認測試覆蓋率達 80%+（core、react、plugin-sort、plugin-filter、plugin-pagination、plugin-datasource、server、server-prisma）
