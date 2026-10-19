# @trellisjs/plugin-inline-edit

## 1.1.0

### Minor Changes

- [#30](https://github.com/cluion/trellis/pull/30) [`37c1af7`](https://github.com/cluion/trellis/commit/37c1af746c7563d4a4b7d1ec64483c9b8b0188b3) Thanks [@cluion](https://github.com/cluion)! - 事件 payload 自動帶型別。

    - core 新增 `TrellisEventMap`：`api.on()` 的 handler 會收到該事件的 payload 型別，`api.emit()` 會檢查 payload，寫錯就編譯失敗
    - 各插件以 module augmentation 登記自己的事件，並匯出 payload 型別（如 `SortChangePayload`、`FilterChangePayload`、`PaginationGotoPayload`、`InlineEditKeydownPayload`），import 插件後即可使用
    - 沒有 payload 的指令（如 `pagination:next`、`state:save`）可省略第二個參數，既有的 `null`、`{}`、`undefined` 寫法照常可用
    - 未登記的事件維持原本行為，payload 為 `unknown`；自訂插件可用同樣方式登記事件
    - 執行期行為不變

## 1.0.0

### Major Changes

- [#23](https://github.com/cluion/trellis/pull/23) [`92657b4`](https://github.com/cluion/trellis/commit/92657b4e194d1a71b9f265ed0919967d06084717) Thanks [@cluion](https://github.com/cluion)! - 新增 `@trellisjs/plugin-inline-edit` 插件 — 無頭式內聯編輯功能。

    - 雙擊或點擊儲存格進入編輯模式（`trigger: 'click' | 'dblclick'`）
    - Enter 確認、Escape 取消、Tab/Shift+Tab 導航至下一個可編輯儲存格
    - 欄位層級驗證（`validate` 回呼）
    - 切換儲存格行為（`editBehavior: 'cancel' | 'commit'`）
    - 事件驅動：`inline-edit:save`、`inline-edit:stop`、`inline-edit:error`
    - 程式化控制：`inline-edit:commit`、`inline-edit:cancel`
