import type { DataRow } from './data';
import type { TrellisAPI } from './plugin';

/**
 * Custom sort comparator.
 * Returns a negative number when a < b, a positive number when a > b, and zero when equal.
 */
export type ColumnSortFn<T = unknown> = (a: T, b: T) => number;

/** Argument passed to `ColumnDef.renderCell`. */
export interface CellContext<T = Record<string, unknown>> {
    /** The row being rendered */
    row: DataRow<T>;
    /** The cell value, read through the column accessor */
    value: unknown;
    /** The column being rendered */
    column: ColumnDef<T>;
    /** The table API, e.g. to emit events or update the row */
    api: TrellisAPI<T>;
}

/** Argument passed to `ColumnDef.renderHeader`. */
export interface HeaderContext<T = Record<string, unknown>> {
    /** The column being rendered */
    column: ColumnDef<T>;
    /** The table API, e.g. to emit `sort:change` */
    api: TrellisAPI<T>;
}

/**
 * A single column definition.
 * The generic `T` is the shape of a data row.
 */
export interface ColumnDef<T = Record<string, unknown>> {
    /** Unique column id */
    id: string;
    /** A key of T, or a function that extracts the value */
    accessor: keyof T | ((row: T) => unknown);
    /** Header text; also used by plugins such as CSV export and clipboard */
    header: string;
    /**
     * Custom cell content. The return value is rendered by the framework adapter:
     * a React node with `@trellisjs/react`, a VNode with `@trellisjs/vue`.
     * Without it the cell shows the value as a string.
     */
    renderCell?: (context: CellContext<T>) => unknown;
    /**
     * Custom header content, rendered by the framework adapter like `renderCell`.
     * Without it the header shows `header`.
     */
    renderHeader?: (context: HeaderContext<T>) => unknown;
    /** Custom sort comparator (overrides the default) */
    sortFn?: ColumnSortFn;
    /** Whether the column can be sorted (default: true when the sort plugin is installed) */
    sortable?: boolean;
    /** Whether the column can be filtered */
    filterable?: boolean;
    /** Column width (CSS value; numbers are pixels) */
    width?: number | string;
    /** Minimum column width (CSS value; numbers are pixels) */
    minWidth?: number | string;
    /** Maximum column width (CSS value; numbers are pixels) */
    maxWidth?: number | string;
    /** Cell content alignment */
    align?: 'left' | 'center' | 'right';
    /** Extra HTML attributes for the column's cells */
    attrs?: Record<string, string>;
    /** Custom cell class name, or a function returning one */
    className?: string | ((row: T, value: unknown) => string);
    /** Whether the column is visible */
    visible?: boolean;
    /** Pin the column to the left or right edge */
    pin?: 'left' | 'right';
    /** Whether the column can be resized (default: true when the resizing plugin is installed) */
    resizable?: boolean;
}
