import type { ColumnDef } from '@trellisjs/core';
import { calculatePinOffsets } from '@trellisjs/core';
import { useTrellisState } from '../hooks/use-trellis-state';
import { ResizeHandle } from './resize-handle';

interface ThProps<T = Record<string, unknown>> {
  column: ColumnDef<T>;
  stickyHeader?: boolean;
}

export function Th<T>({ column, stickyHeader = false }: ThProps<T>) {
  const state = useTrellisState();
  const style: React.CSSProperties = {};
  if (column.width) style.width = column.width;
  if (column.minWidth) style.minWidth = column.minWidth;
  if (column.maxWidth) style.maxWidth = column.maxWidth;
  if (column.align) style.textAlign = column.align;
  if (stickyHeader) {
    style.position = 'sticky';
    style.top = 0;
  }

  // Column pinning sticky styles
  const pinInfo = getPinInfo(column.id, state);
  if (pinInfo) {
    style.position = 'sticky';
    if (pinInfo.side === 'left') {
      style.left = pinInfo.offset;
    } else {
      style.right = pinInfo.offset;
    }
    style.zIndex = stickyHeader ? 3 : 2;
  }

  // Build className for shadow borders
  let className: string | undefined;
  if (pinInfo?.isLastLeft) {
    className = 'trellis-pin-shadow--left';
  } else if (pinInfo?.isFirstRight) {
    className = 'trellis-pin-shadow--right';
  }

  // Column resizing: show ResizeHandle when plugin is active and column is resizable
  const resizing = state.columnResizing;
  const showResizeHandle = resizing && column.resizable !== false;

  if (showResizeHandle) {
    style.position = 'relative';
    const resizedWidth = resizing.columnWidths[column.id];
    if (resizedWidth !== undefined) {
      style.width = resizedWidth;
    } else if (!column.width) {
      style.width = resizing.defaultWidth;
    }
  }

  return (
    <th style={Object.keys(style).length > 0 ? style : undefined} className={className}>
      {column.header}
      {showResizeHandle && <ResizeHandle columnId={column.id} />}
    </th>
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
