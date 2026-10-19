import type { ColumnDef } from '../types/column';
import { calculatePinOffsets } from '../types/column-pinning';
import type { PinOffset } from '../types/column-pinning';
import type { TableState } from '../types/state';

/** 行內樣式；長度一律是帶單位的字串，React 與 Vue 都能直接套用。 */
export type CellStyle = Record<string, string | number>;

/** 儲存格的行內樣式與 class，框架適配器直接套用到 th / td。 */
export interface CellLayout {
    /** 沒有任何樣式時為 undefined */
    style?: CellStyle;
    className?: string;
}

export interface HeaderCellLayout extends CellLayout {
    /** 是否顯示調整欄寬的把手 */
    resizable: boolean;
}

type LayoutState<T> = Pick<
    TableState<T>,
    'columns' | 'columnPinning' | 'columnVisibility' | 'columnResizing'
>;

function toLength(value: number | string): string {
    return typeof value === 'number' ? `${value}px` : value;
}

function getPinOffset<T>(
    columnId: string,
    state: LayoutState<T>,
): PinOffset | null {
    const { columnPinning, columnVisibility, columns } = state;

    if (
        !columnPinning ||
        (columnPinning.left.length === 0 && columnPinning.right.length === 0)
    ) {
        return null;
    }

    return (
        calculatePinOffsets(columns, columnPinning, columnVisibility).get(
            columnId,
        ) ?? null
    );
}

function applyPin(style: CellStyle, pin: PinOffset, zIndex: number): void {
    style.position = 'sticky';
    style[pin.side] = toLength(pin.offset);
    style.zIndex = zIndex;
}

function pinShadowClass(pin: PinOffset | null): string | undefined {
    if (pin?.isLastLeft) {
        return 'trellis-pin-shadow--left';
    }

    if (pin?.isFirstRight) {
        return 'trellis-pin-shadow--right';
    }

    return undefined;
}

function nonEmpty(style: CellStyle): CellStyle | undefined {
    return Object.keys(style).length > 0 ? style : undefined;
}

/**
 * 計算表頭儲存格（th）的樣式：欄寬、對齊、固定表頭、欄釘選與調整欄寬。
 */
export function getHeaderCellLayout<T>(
    column: ColumnDef<T>,
    state: LayoutState<T>,
    stickyHeader = false,
): HeaderCellLayout {
    const style: CellStyle = {};

    if (column.width) {
        style.width = toLength(column.width);
    }

    if (column.minWidth) {
        style.minWidth = toLength(column.minWidth);
    }

    if (column.maxWidth) {
        style.maxWidth = toLength(column.maxWidth);
    }

    if (column.align) {
        style.textAlign = column.align;
    }

    if (stickyHeader) {
        style.position = 'sticky';
        style.top = 0;
    }

    const pin = getPinOffset(column.id, state);

    if (pin) {
        applyPin(style, pin, stickyHeader ? 3 : 2);
    }

    const resizing = state.columnResizing;
    const resizable = !!resizing && column.resizable !== false;

    if (resizing && resizable) {
        // sticky 本身就是把手的定位容器，只有非 sticky 時才需要 relative
        if (style.position !== 'sticky') {
            style.position = 'relative';
        }

        const resizedWidth = resizing.columnWidths[column.id];

        if (resizedWidth !== undefined) {
            style.width = toLength(resizedWidth);
        } else if (!column.width) {
            style.width = toLength(resizing.defaultWidth);
        }
    }

    return {
        style: nonEmpty(style),
        className: pinShadowClass(pin),
        resizable,
    };
}

/**
 * 計算資料儲存格（td）的樣式：對齊與欄釘選。
 */
export function getBodyCellLayout<T>(
    column: ColumnDef<T>,
    state: LayoutState<T>,
): CellLayout {
    const style: CellStyle = {};

    if (column.align) {
        style.textAlign = column.align;
    }

    const pin = getPinOffset(column.id, state);

    if (pin) {
        applyPin(style, pin, 1);
    }

    return { style: nonEmpty(style), className: pinShadowClass(pin) };
}
