import type { ColumnDef } from '@trellisjs/core';
import { Th } from './th';

interface TableHeadProps<T = Record<string, unknown>> {
  columns: ColumnDef<T>[];
}

export function TableHead<T>({ columns }: TableHeadProps<T>) {
  return (
    <thead>
      <tr>
        {columns
          .filter((col) => col.visible !== false)
          .map((col) => (
            <Th key={col.id} column={col} />
          ))}
      </tr>
    </thead>
  );
}
