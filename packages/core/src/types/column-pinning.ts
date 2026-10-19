import type { ColumnDef } from './column';
import type { ColumnResizingState } from './column-resizing';

/** 欄釘選狀態 */
export interface ColumnPinningState {
    /** 左側釘選欄位 ID 列表（按視覺順序） */
    left: string[];
    /** 右側釘選欄位 ID 列表（按視覺順序） */
    right: string[];
}

/** 單一釘選欄位的 offset 資訊 */
export interface PinOffset {
    side: 'left' | 'right';
    offset: number;
    isLastLeft: boolean;
    isFirstRight: boolean;
}

/**
 * 欄位實際渲染的寬度（px），規則與表頭儲存格套用的寬度一致：
 * 可調整欄寬時優先用調整後的寬度，沒有 width 時用 defaultWidth；
 * 其餘情況用數字 width，非數字（如 '20%'）無法換算時視為 0。
 */
function resolveColumnWidth<T>(
    column: ColumnDef<T> | undefined,
    columnResizing?: ColumnResizingState,
): number {
    if (!column) {
        return 0;
    }

    if (columnResizing && column.resizable !== false) {
        const resized = columnResizing.columnWidths[column.id];

        if (resized !== undefined) {
            return resized;
        }

        if (!column.width) {
            return columnResizing.defaultWidth;
        }
    }

    return typeof column.width === 'number' ? column.width : 0;
}

/**
 * 計算釘選欄位的 CSS offset。
 * left offset = 同側前面所有可見釘選欄位的寬度總和
 * right offset = 同側後面所有可見釘選欄位的寬度總和
 *
 * 有傳 columnResizing 時，會改用調整後的欄寬。
 */
export function calculatePinOffsets<T>(
    columns: ColumnDef<T>[],
    columnPinning: { left: string[]; right: string[] },
    columnVisibility: Record<string, boolean>,
    columnResizing?: ColumnResizingState,
): Map<string, PinOffset> {
    const offsets = new Map<string, PinOffset>();
    const isHidden = (id: string) => columnVisibility[id] === false;

    // Left offsets
    let leftAccum = 0;

    for (let i = 0; i < columnPinning.left.length; i++) {
        const colId = columnPinning.left[i];
        const isLastLeft = i === columnPinning.left.length - 1;

        offsets.set(colId, {
            side: 'left',
            offset: leftAccum,
            isLastLeft,
            isFirstRight: false,
        });

        if (!isHidden(colId)) {
            leftAccum += resolveColumnWidth(
                columns.find((c) => c.id === colId),
                columnResizing,
            );
        }
    }

    // Right offsets — accumulate from right to left
    let rightAccum = 0;

    for (let i = columnPinning.right.length - 1; i >= 0; i--) {
        const colId = columnPinning.right[i];
        const isFirstRight = i === 0;

        offsets.set(colId, {
            side: 'right',
            offset: rightAccum,
            isLastLeft: false,
            isFirstRight,
        });

        if (!isHidden(colId)) {
            rightAccum += resolveColumnWidth(
                columns.find((c) => c.id === colId),
                columnResizing,
            );
        }
    }

    return offsets;
}
