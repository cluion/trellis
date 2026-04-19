import type { DataRow } from '@trellisjs/core';
import { useTrellisContext } from '../context';
import { SlotRenderer } from '../slots/slot-renderer';

interface ExpansionRowProps<T = Record<string, unknown>> {
  row: DataRow<T>;
  colSpan: number;
}

/**
 * 展開區域元件。
 * 渲染一個 <tr> 包含 <td colSpan={n}>，內容由 slot renderer 決定。
 * 使用 stopPropagation 防止點擊冒泡到 Tr 的 selection handler。
 */
export function ExpansionRow<T>({ row, colSpan }: ExpansionRowProps<T>) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <tr className="trellis-expansion-row trellis-expansion--expanded" onClick={handleClick}>
      <td colSpan={colSpan} className="trellis-expansion-cell">
        <SlotRenderer
          name="expansion:default"
          context={{ row: row.original, rowId: row.id }}
        />
      </td>
    </tr>
  );
}
