import type { ColumnDef } from '@trellisjs/core';
import { getHeaderCellLayout } from '@trellisjs/core';
import type { ReactNode } from 'react';
import { useTrellisContext } from '../context';
import { useTrellisState } from '../hooks/use-trellis-state';
import { ResizeHandle } from './resize-handle';

interface ThProps<T = Record<string, unknown>> {
    column: ColumnDef<T>;
    stickyHeader?: boolean;
}

/**
 * Header cell: width, alignment, sticky header, column pinning and the resize handle.
 * Renders `column.renderHeader` when provided, otherwise `column.header`.
 */
export function Th<T>({ column, stickyHeader = false }: ThProps<T>) {
    const api = useTrellisContext<T>();
    const state = useTrellisState<T>();
    const { style, className, resizable } = getHeaderCellLayout(
        column,
        state,
        stickyHeader,
    );
    const content = column.renderHeader
        ? (column.renderHeader({ column, api }) as ReactNode)
        : column.header;

    return (
        <th
            style={style as React.CSSProperties | undefined}
            className={className}
        >
            {content}
            {resizable && <ResizeHandle columnId={column.id} />}
        </th>
    );
}
