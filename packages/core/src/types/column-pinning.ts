import type { ColumnDef } from './column';

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
 * 計算釘選欄位的 CSS offset。
 * left offset = 同側前面所有可見釘選欄位的 width 總和
 * right offset = 同側後面所有可見釘選欄位的 width 總和
 */
export function calculatePinOffsets<T>(
  columns: ColumnDef<T>[],
  columnPinning: { left: string[]; right: string[] },
  columnVisibility: Record<string, boolean>,
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
      const col = columns.find((c) => c.id === colId);
      leftAccum += typeof col?.width === 'number' ? col.width : 0;
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
      const col = columns.find((c) => c.id === colId);
      rightAccum += typeof col?.width === 'number' ? col.width : 0;
    }
  }

  return offsets;
}
