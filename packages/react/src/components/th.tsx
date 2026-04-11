import type { ColumnDef } from '@trellisjs/core';

interface ThProps<T = Record<string, unknown>> {
  column: ColumnDef<T>;
}

export function Th<T>({ column }: ThProps<T>) {
  const style: React.CSSProperties = {};
  if (column.width) style.width = column.width;
  if (column.minWidth) style.minWidth = column.minWidth;
  if (column.maxWidth) style.maxWidth = column.maxWidth;
  if (column.align) style.textAlign = column.align;

  return (
    <th style={Object.keys(style).length > 0 ? style : undefined}>
      {column.header}
    </th>
  );
}
