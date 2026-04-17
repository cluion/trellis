import type { ColumnDef, DataRow } from '@trellisjs/core';
import { useTrellisContext } from '../context';
import { Tr } from './tr';

interface VirtualScrollBodyProps<T = Record<string, unknown>> {
  data?: DataRow<T>[];
  columns?: ColumnDef<T>[];
}

/**
 * 虛擬滾動版本的 TableBody。
 * 只渲染 startIndex 到 endIndex 範圍內的行，
 * 上下用空白 <tr> 佔位撐高。
 * 直接從 context 讀取狀態，props 僅為相容 TableBody 介面。
 */
export function VirtualScrollBody<T>(_props?: VirtualScrollBodyProps<T>) {
  const api = useTrellisContext();
  const state = api.getState();
  const { data, columns } = state;
  const vs = state.virtualScroll;

  // 沒有 virtualScroll 狀態時，回退到渲染全部行
  if (!vs) {
    return (
      <tbody>
        {data.map((row) => (
          <Tr key={row.id} row={row} columns={columns} />
        ))}
      </tbody>
    );
  }

  const { startIndex, endIndex, rowHeight, totalHeight } = vs;

  // 計算佔位高度
  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, totalHeight - endIndex * rowHeight);
  const visibleColumnCount = columns.filter((col) => col.visible !== false).length;

  return (
    <tbody>
      {topSpacerHeight > 0 && (
        <tr className="trellis-virtual-scroll__spacer trellis-virtual-scroll__spacer--top">
          <td colSpan={visibleColumnCount} style={{ height: topSpacerHeight, padding: 0 }} />
        </tr>
      )}
      {data.map((row) => (
        <Tr key={row.id} row={row} columns={columns} className="trellis-virtual-scroll__data-row" />
      ))}
      {bottomSpacerHeight > 0 && (
        <tr className="trellis-virtual-scroll__spacer trellis-virtual-scroll__spacer--bottom">
          <td colSpan={visibleColumnCount} style={{ height: bottomSpacerHeight, padding: 0 }} />
        </tr>
      )}
    </tbody>
  );
}
