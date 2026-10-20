import type { ColumnDef, DataRow } from '@trellisjs/core';
import { getBodyCellLayout, getCellValue } from '@trellisjs/core';
import type { ReactNode } from 'react';
import { useTrellisContext } from '../context';
import { useTrellisState } from '../hooks/use-trellis-state';

interface TdProps<T = Record<string, unknown>> {
    row: DataRow<T>;
    column: ColumnDef<T>;
}

/**
 * Data cell: alignment and column pinning.
 * Renders `column.renderCell` when provided, otherwise the value as a string.
 */
export function Td<T>({ row, column }: TdProps<T>) {
    const api = useTrellisContext<T>();
    const state = useTrellisState<T>();
    const value = getCellValue(row, column);
    const { style, className } = getBodyCellLayout(column, state);
    const content = column.renderCell
        ? (column.renderCell({ row, value, column, api }) as ReactNode)
        : value != null
          ? String(value)
          : '';

    return (
        <td
            style={style as React.CSSProperties | undefined}
            className={className}
        >
            {content}
        </td>
    );
}
