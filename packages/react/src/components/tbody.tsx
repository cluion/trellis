import { Fragment } from 'react';
import type { ColumnDef, DataRow } from '@trellisjs/core';
import { Tr } from './tr';
import { ExpansionRow } from './expansion-row';
import { useTrellisState } from '../hooks/use-trellis-state';

interface TableBodyProps<T = Record<string, unknown>> {
  data: DataRow<T>[];
  columns: ColumnDef<T>[];
}

export function TableBody<T>({ data, columns }: TableBodyProps<T>) {
  const state = useTrellisState();
  const hasExpansion = !!state.rowExpansion;
  const visibleColumns = columns.filter((col) => col.visible !== false);
  const colSpan = hasExpansion ? visibleColumns.length + 1 : visibleColumns.length;

  return (
    <tbody>
      {data.map((row) => {
        const isExpanded = state.expandedRows.has(row.id);
        return (
          <Fragment key={row.id}>
            <Tr row={row} columns={columns} hasExpansion={hasExpansion} />
            {isExpanded && <ExpansionRow row={row} colSpan={colSpan} />}
          </Fragment>
        );
      })}
    </tbody>
  );
}
