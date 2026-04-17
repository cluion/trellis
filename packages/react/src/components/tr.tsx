import type { ColumnDef, DataRow } from '@trellisjs/core';
import { Td } from './td';

interface TableRowProps<T = Record<string, unknown>> {
  row: DataRow<T>;
  columns: ColumnDef<T>[];
  className?: string;
}

export function Tr<T>({ row, columns, className }: TableRowProps<T>) {
  return (
    <tr className={className}>
      {columns
        .filter((col) => col.visible !== false)
        .map((col) => (
          <Td key={col.id} row={row} column={col} />
        ))}
    </tr>
  );
}
