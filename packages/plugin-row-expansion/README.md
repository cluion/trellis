# @trellisjs/plugin-row-expansion

Trellis 行展開插件 — 點擊表格行展開額外的自定義內容區域。

## 安裝

```bash
pnpm add @trellisjs/plugin-row-expansion
```

## 使用方式

### 基本用法

```tsx
import { useTrellis } from '@trellisjs/react';
import { createRowExpansionPlugin } from '@trellisjs/plugin-row-expansion';

function MyTable({ data, columns }) {
  const { api } = useTrellis({
    data,
    columns,
    plugins: [createRowExpansionPlugin()],
  });

  // 註冊展開區域的渲染器
  api.registerSlot('expansion:default', (ctx) => (
    <div>詳細資訊：{ctx.row.name}</div>
  ));

  // ...渲染表格
}
```

### Multi 模式（同時展開多行）

```tsx
createRowExpansionPlugin({ mode: 'multi' })
```

### Single 模式（Accordion，一次只展開一行）

```tsx
createRowExpansionPlugin({ mode: 'single' }) // 預設
```

### 自訂圖示

```tsx
createRowExpansionPlugin({
  mode: 'multi',
  expandIcon: <PlusIcon />,
  collapseIcon: <MinusIcon />,
})
```

## 事件

| 事件 | Payload | 說明 |
|------|---------|------|
| `expansion:toggle` | `{ rowId: string }` | 切換指定行的展開/收合 |
| `expansion:expand` | `{ rowId: string }` | 展開指定行 |
| `expansion:collapse` | `{ rowId: string }` | 收合指定行 |
| `expansion:expandAll` | `null` | 展開所有行（僅 multi 模式） |
| `expansion:collapseAll` | `null` | 收合所有行 |

## Slot 約定

| Slot 名稱 | 說明 |
|-----------|------|
| `expansion:default` | 所有展開行的預設渲染器。接收 `{ row, rowId }` context |

## API

### `createRowExpansionPlugin(options?)`

**參數：**

| 選項 | 類型 | 預設 | 說明 |
|------|------|------|------|
| `mode` | `'single' \| 'multi'` | `'single'` | 展開模式 |
| `expandIcon` | `unknown` | `'▶'` | 自訂展開圖示 |
| `collapseIcon` | `unknown` | `'▼'` | 自訂收合圖示 |

### 狀態

插件在 `TableState` 中管理以下欄位：

- `expandedRows: Set<DataId>` — 目前展開的行 ID 集合
- `rowExpansion?: { mode }` — 插件設定（由插件安裝時設定）

## 行為特性

- **資料變更清理**：排序、篩選、分頁變更後，不在 `state.data` 中的行 ID 會自動從 `expandedRows` 移除
- **Click 隔離**：展開區域的點擊事件使用 `stopPropagation` 防止冒泡到行選取處理器
- **CSS 過渡**：展開/收合時套用 `trellis-expansion--expanded` class，可搭配 CSS transition 實現動畫

## React 元件

- `ExpansionToggle` — 展開/收合箭頭按鈕
- `ExpansionRow` — 展開區域的 `<tr>` + `<td colSpan>`

## License

MIT
