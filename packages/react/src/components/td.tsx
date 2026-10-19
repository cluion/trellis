import type { ColumnDef, DataRow } from '@trellisjs/core';
import { getBodyCellLayout, getCellValue } from '@trellisjs/core';
import { useTrellisState } from '../hooks/use-trellis-state';

interface TdProps<T = Record<string, unknown>> {
    row: DataRow<T>;
    column: ColumnDef<T>;
}

export function Td<T>({ row, column }: TdProps<T>) {
    const state = useTrellisState<T>();
    const value = getCellValue(row, column);
    const { style, className } = getBodyCellLayout(column, state);

    return (
        <td
            style={style as React.CSSProperties | undefined}
            className={className}
        >
            {value != null ? String(value) : ''}
        </td>
    );
}
