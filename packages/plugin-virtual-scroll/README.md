# @trellisjs/plugin-virtual-scroll

Trellis 虛擬滾動插件 — DOM-based 行虛擬化，支援大量資料流暢滾動。

## 安裝

```bash
pnpm add @trellisjs/plugin-virtual-scroll
```

## 使用方式

### 基本用法

```tsx
import { createVirtualScrollPlugin } from '@trellisjs/plugin-virtual-scroll';
import { useVirtualScroll } from '@trellisjs/react';

const vsPlugin = createVirtualScrollPlugin({
  rowHeight: 40,  // 固定行高 (px)
  overscan: 5,    // 上下各額外渲染的行數
});

const { api } = useTrellis({
  data: largeDataset,    // 10,000+ 筆資料
  columns,
  pageSize: largeDataset.length,  // 建議不分頁
  plugins: [vsPlugin],
});

// 綁定滾動容器
const { containerRef, style } = useVirtualScroll(vsPlugin);

return (
  <div ref={containerRef} style={{ ...style, maxHeight: 500 }}>
    <table>
      <tbody>
        {/* 渲染 state.data 中的行 */}
        {/* 上下佔位行自動由插件計算 */}
      </tbody>
    </table>
  </div>
);
```

### 與 Pagination 共存

虛擬滾動在 Transform Pipeline 中 priority=35（在 pagination=30 之後）。兩者可以同時啟用：

- **Pagination**：決定「總資料中的哪一段」（資料層分頁）
- **VirtualScroll**：決定「分頁資料中的哪幾行要渲染」（渲染層切片）

建議配置：
- 大資料量（10,000+ 筆）：設定 `pageSize` 為資料總量（等同不分頁），讓虛擬滾動管理渲染
- 中等資料量：保持 pagination 正常 pageSize，虛擬滾動減少每頁的 DOM 節點數

## API

### `createVirtualScrollPlugin(options?)`

建立虛擬滾動插件實例。

#### 選項

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `rowHeight` | `number \| 'auto'` | `'auto'`（fallback 40px） | 單行高度。固定值效能最佳 |
| `overscan` | `number` | `5` | 可視區域上下各額外渲染的行數 |

#### 回傳

`VirtualScrollPlugin` — 擴充的 `TrellisPlugin`，額外提供：

- `attachScrollContainer(element)` — 綁定滾動容器 DOM 元素
- `detachScrollContainer()` — 解除綁定

### `useVirtualScroll(plugin)`

React hook，管理滾動容器綁定和生命週期。

回傳 `{ containerRef, style }`。

### TableState 新增欄位

啟用插件後，`state.virtualScroll` 包含：

```typescript
interface VirtualScrollState {
  startIndex: number;  // 可視區域起始索引（含 overscan）
  endIndex: number;    // 可視區域結束索引（含 overscan）
  totalHeight: number; // 全部資料的總高度 (px)
  rowHeight: number;   // 單行高度 (px)
}
```

## 設計決策

- **Transform-based**：透過 `registerTransform` 加入 pipeline（priority=35），與 filter/sort/pagination 一致
- **rAF 節流**：滾動事件使用 `requestAnimationFrame` + dirty flag 合併，每 frame 只重算一次
- **佔位撐高**：上下空白 `<tr>` 佔位，確保滾動條正確反映資料總量
- **固定行高為主**：v1 以固定行高計算，動態行高標記為 experimental
