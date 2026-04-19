import type { ColumnDef } from '@trellisjs/core';
import { Th } from './th';
import { useTrellisState } from '../hooks/use-trellis-state';

interface TableHeadProps<T = Record<string, unknown>> {
  columns: ColumnDef<T>[];
  stickyHeader?: boolean;
}

export function TableHead<T>({ columns, stickyHeader = false }: TableHeadProps<T>) {
  const state = useTrellisState();
  const hasExpansion = !!state.rowExpansion;
  const className = stickyHeader ? 'trellis-thead--sticky' : undefined;

  return (
    <thead className={className}>
      <tr>
        {hasExpansion && <th className="trellis-expansion-th" />}
        {columns
          .filter((col) => col.visible !== false)
          .map((col) => (
            <Th key={col.id} column={col} stickyHeader={stickyHeader} />
          ))}
      </tr>
    </thead>
  );
}
