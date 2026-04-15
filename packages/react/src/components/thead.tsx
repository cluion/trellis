import type { ColumnDef } from '@trellisjs/core';
import { Th } from './th';

interface TableHeadProps<T = Record<string, unknown>> {
  columns: ColumnDef<T>[];
  stickyHeader?: boolean;
}

export function TableHead<T>({ columns, stickyHeader = false }: TableHeadProps<T>) {
  const className = stickyHeader ? 'trellis-thead--sticky' : undefined;

  return (
    <thead className={className}>
      <tr>
        {columns
          .filter((col) => col.visible !== false)
          .map((col) => (
            <Th key={col.id} column={col} stickyHeader={stickyHeader} />
          ))}
      </tr>
    </thead>
  );
}
