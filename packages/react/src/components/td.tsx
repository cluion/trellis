import type { ColumnDef, DataRow } from '@trellisjs/core';

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
  const value = getCellValue(row, column);
  const style: React.CSSProperties = {};
  if (column.align) style.textAlign = column.align;

  return (
    <td style={Object.keys(style).length > 0 ? style : undefined}>
      {value != null ? String(value) : ''}
    </td>
  );
}
