import type { ColumnDef, DataRow } from '@trellisjs/core';
import { Tr } from './tr';

interface TableBodyProps<T = Record<string, unknown>> {
  data: DataRow<T>[];
  columns: ColumnDef<T>[];
}

export function TableBody<T>({ data, columns }: TableBodyProps<T>) {
  return (
    <tbody>
      {data.map((row) => (
        <Tr key={row.id} row={row} columns={columns} />
      ))}
    </tbody>
  );
}
