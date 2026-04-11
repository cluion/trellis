import type { ColumnDef, DataRow } from '@trellisjs/core';
import { Td } from './td';

interface TableRowProps<T = Record<string, unknown>> {
  row: DataRow<T>;
  columns: ColumnDef<T>[];
}

export function Tr<T>({ row, columns }: TableRowProps<T>) {
  return (
    <tr>
      {columns
        .filter((col) => col.visible !== false)
        .map((col) => (
          <Td key={col.id} row={row} column={col} />
        ))}
    </tr>
  );
}
