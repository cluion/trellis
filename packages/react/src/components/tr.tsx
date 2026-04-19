import type { ColumnDef, DataRow } from '@trellisjs/core';
import { Td } from './td';
import { ExpansionToggle } from './expansion-toggle';
import { useTrellisState } from '../hooks/use-trellis-state';

interface TableRowProps<T = Record<string, unknown>> {
  row: DataRow<T>;
  columns: ColumnDef<T>[];
  hasExpansion?: boolean;
  className?: string;
}

export function Tr<T>({ row, columns, hasExpansion, className }: TableRowProps<T>) {
  const state = useTrellisState();
  const expandIcon = state.rowExpansion?.expandIcon as React.ReactNode | undefined;
  const collapseIcon = state.rowExpansion?.collapseIcon as React.ReactNode | undefined;

  return (
    <tr className={className}>
      {hasExpansion && (
        <td className="trellis-expansion-td">
          <ExpansionToggle
            rowId={row.id}
            expandIcon={expandIcon}
            collapseIcon={collapseIcon}
          />
        </td>
      )}
      {columns
        .filter((col) => col.visible !== false)
        .map((col) => (
          <Td key={col.id} row={row} column={col} />
        ))}
    </tr>
  );
}
