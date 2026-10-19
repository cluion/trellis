import type { ColumnDef } from '@trellisjs/core';
import { getHeaderCellLayout } from '@trellisjs/core';
import { useTrellisState } from '../hooks/use-trellis-state';
import { ResizeHandle } from './resize-handle';

interface ThProps<T = Record<string, unknown>> {
    column: ColumnDef<T>;
    stickyHeader?: boolean;
}

export function Th<T>({ column, stickyHeader = false }: ThProps<T>) {
    const state = useTrellisState<T>();
    const { style, className, resizable } = getHeaderCellLayout(
        column,
        state,
        stickyHeader,
    );

    return (
        <th
            style={style as React.CSSProperties | undefined}
            className={className}
        >
            {column.header}
            {resizable && <ResizeHandle columnId={column.id} />}
        </th>
    );
}
