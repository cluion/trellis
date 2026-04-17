import { useMemo } from 'react';
import { useTrellis, useVirtualScroll } from '@trellisjs/react';
import { createVirtualScrollPlugin } from '@trellisjs/plugin-virtual-scroll';
import type { ColumnDef } from '@trellisjs/core';

interface BigItem {
  id: number;
  name: string;
  category: string;
  value: number;
  date: string;
}

const categories = ['Electronics', 'Books', 'Clothing', 'Food', 'Tools', 'Sports', 'Music', 'Art'];
const firstNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];

function generateBigData(count: number): BigItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${firstNames[i % firstNames.length]}-${String(i + 1).padStart(5, '0')}`,
    category: categories[i % categories.length],
    value: Math.round(Math.random() * 10000),
    date: new Date(2020 + Math.floor(i / 365), Math.floor((i % 365) / 30), (i % 28) + 1)
      .toISOString().slice(0, 10),
  }));
}

const columns: ColumnDef<BigItem>[] = [
  { id: 'id', accessor: 'id', header: 'ID', width: 80, align: 'center' },
  { id: 'name', accessor: 'name', header: '名稱' },
  { id: 'category', accessor: 'category', header: '分類', width: 120 },
  { id: 'value', accessor: 'value', header: '數值', width: 100, align: 'right' },
  { id: 'date', accessor: 'date', header: '日期', width: 120 },
];

interface VirtualScrollTableProps {
  count?: number;
}

export function VirtualScrollTable({ count = 10000 }: VirtualScrollTableProps) {
  const data = useMemo(() => generateBigData(count), [count]);
  const vsPlugin = useMemo(() => createVirtualScrollPlugin({ rowHeight: 40, overscan: 5 }), []);

  const { api } = useTrellis<BigItem>({
    data,
    columns,
    pageSize: count, // 不分頁，全部資料交給虛擬滾動管理
    plugins: [vsPlugin],
  });

  const { containerRef, style } = useVirtualScroll(vsPlugin);
  const state = api.getState();
  const vs = state.virtualScroll;

  return (
    <div>
      <div className="status-bar">
        <span>
          總資料量：{count.toLocaleString()} 筆 |
          渲染範圍：{vs ? `${vs.startIndex + 1} - ${vs.endIndex}` : '全部'} |
          DOM 節點：{state.data.length} 個行
        </span>
      </div>

      <div ref={containerRef} style={{ ...style, maxHeight: 500, border: '1px solid #e5e7eb', borderRadius: 4 }}>
        <table className="trellis-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} style={{ width: col.width, textAlign: col.align }}>
                  {String(col.header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vs && vs.startIndex > 0 && (
              <tr>
                <td colSpan={columns.length} style={{ height: vs.startIndex * vs.rowHeight, padding: 0 }} />
              </tr>
            )}
            {state.data.map((row) => (
              <tr key={row.id} style={{ height: 40 }}>
                {columns.map((col) => (
                  <td key={col.id} style={{ textAlign: col.align }}>
                    {String(row.original[col.accessor as keyof BigItem] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {vs && vs.endIndex < count && (
              <tr>
                <td colSpan={columns.length} style={{ height: (count - vs.endIndex) * vs.rowHeight, padding: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
