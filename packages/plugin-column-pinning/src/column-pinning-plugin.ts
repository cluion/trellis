import type { TrellisPlugin, TrellisAPI, ColumnDef, TableState } from '@trellisjs/core';

export interface PinTogglePayload {
  columnId: string;
  side: 'left' | 'right';
}

export interface PinSetPayload {
  left: string[];
  right: string[];
}

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

/**
 * 從 ColumnDef 中提取初始釘選設定。
 */
function extractPinsFromColumns<T>(columns: ColumnDef<T>[]): { left: string[]; right: string[] } {
  const left: string[] = [];
  const right: string[] = [];

  for (const col of columns) {
    if (col.pin === 'left') {
      left.push(col.id);
    } else if (col.pin === 'right') {
      right.push(col.id);
    }
  }

  return { left, right };
}

export interface ColumnPinningPlugin extends TrellisPlugin {
  /** 取得目前各釘選欄位的 offset 資訊 */
  getPinOffsets(state: TableState): Map<string, PinOffset>;
}

/**
 * 建立 column-pinning 插件實例。
 * 欄釘選是純渲染層能力，不註冊 transform。
 */
export function createColumnPinningPlugin(): ColumnPinningPlugin {
  const unsubscribers: (() => void)[] = [];

  const plugin: ColumnPinningPlugin = {
    name: 'column-pinning',

    install(api: TrellisAPI) {
      // 初始化：從 ColumnDef.pin 讀取釘選設定
      const state = api.getState();
      const initialPins = extractPinsFromColumns(state.columns);

      if (initialPins.left.length > 0 || initialPins.right.length > 0) {
        api.setState(() => ({
          columnPinning: initialPins,
        }));
      }

      // column-pin:toggle — 切換釘選狀態
      const unsubToggle = api.on('column-pin:toggle', (payload) => {
        const { columnId, side } = payload as PinTogglePayload;
        const current = api.getState().columnPinning;
        const list = current[side];

        if (list.includes(columnId)) {
          api.setState(() => ({
            columnPinning: {
              ...current,
              [side]: list.filter((id) => id !== columnId),
            },
          }));
        } else {
          api.setState(() => ({
            columnPinning: {
              ...current,
              [side]: [...list, columnId],
            },
          }));
        }
      });
      unsubscribers.push(unsubToggle);

      // column-pin:set — 直接設定釘選列表
      const unsubSet = api.on('column-pin:set', (payload) => {
        const { left, right } = payload as PinSetPayload;
        api.setState(() => ({
          columnPinning: { left, right },
        }));
      });
      unsubscribers.push(unsubSet);

      // column-pin:clear — 清除所有釘選
      const unsubClear = api.on('column-pin:clear', () => {
        api.setState(() => ({
          columnPinning: { left: [], right: [] },
        }));
      });
      unsubscribers.push(unsubClear);
    },

    destroy() {
      unsubscribers.forEach((unsub) => unsub());
      unsubscribers.length = 0;
    },

    getPinOffsets(state: TableState) {
      return calculatePinOffsets(
        state.columns,
        state.columnPinning,
        state.columnVisibility,
      );
    },
  };

  return plugin;
}
