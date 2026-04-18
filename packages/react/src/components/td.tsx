import type { ColumnDef, DataRow } from '@trellisjs/core';
import { useTrellisContext } from '../context';
import { calculatePinOffsets } from '@trellisjs/plugin-column-pinning';

interface TdProps<T = Record<string, unknown>> {
  row: DataRow<T>;
  column: ColumnDef<T>;
}

function getCellValue<T>(row: DataRow<T>, column: ColumnDef<T>): unknown {
  const { accessor } = column;
  if (typeof accessor === 'function') {
    return accessor(row.original);
  }
  return row.original[accessor];
}

export function Td<T>({ row, column }: TdProps<T>) {
  const api = useTrellisContext();
  const state = api.getState();
  const value = getCellValue(row, column);
  const style: React.CSSProperties = {};
  if (column.align) style.textAlign = column.align;

  // Column pinning sticky styles
  const pinInfo = getPinInfo(column.id, state);
  if (pinInfo) {
    style.position = 'sticky';
    if (pinInfo.side === 'left') {
      style.left = pinInfo.offset;
    } else {
      style.right = pinInfo.offset;
    }
    style.zIndex = 1;
  }

  // Build className for shadow borders
  let className: string | undefined;
  if (pinInfo?.isLastLeft) {
    className = 'trellis-pin-shadow--left';
  } else if (pinInfo?.isFirstRight) {
    className = 'trellis-pin-shadow--right';
  }

  return (
    <td style={Object.keys(style).length > 0 ? style : undefined} className={className}>
      {value != null ? String(value) : ''}
    </td>
  );
}

function getPinInfo(
  columnId: string,
  state: { columns: ColumnDef[]; columnPinning: { left: string[]; right: string[] }; columnVisibility: Record<string, boolean> },
) {
  const { columnPinning, columnVisibility, columns } = state;
  if (!columnPinning || (columnPinning.left.length === 0 && columnPinning.right.length === 0)) {
    return null;
  }

  const offsets = calculatePinOffsets(columns, columnPinning, columnVisibility);
  return offsets.get(columnId) ?? null;
}
