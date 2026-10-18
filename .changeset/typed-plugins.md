---
"@trellisjs/core": minor
"@trellisjs/react": minor
"@trellisjs/plugin-datasource": minor
---

修正 TypeScript 使用者照 README 寫法遇到的型別錯誤。

- `TrellisOptions.plugins` 接受任意列型別的插件，`useTrellis<User>({ plugins: [createSortPlugin()] })` 不再出現 `TrellisPlugin<Record<string, unknown>>` 無法指派給 `TrellisPlugin<User>` 的錯誤
- `Trellis`、`useTrellis`、`createStaticDatasource` 的型別約束由 `Record<string, unknown>` 放寬為 `object`，可以直接使用 `interface` 定義的資料型別
- `TrellisContext` 接受任意列型別的 api，`<TrellisContext.Provider value={api}>` 可以傳入 `TrellisAPI<User>`
- `TableInfo` 改為無條件讀取 context，符合 rules of hooks；有傳 `pagination` prop 時仍不需要 Provider
