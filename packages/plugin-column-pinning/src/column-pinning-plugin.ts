import type { TrellisPlugin, TrellisAPI, ColumnDef, TableState } from '@trellisjs/core';
import { calculatePinOffsets } from '@trellisjs/core';
import type { PinOffset } from '@trellisjs/core';

export type { PinOffset } from '@trellisjs/core';
export { calculatePinOffsets } from '@trellisjs/core';

export interface PinTogglePayload {
  columnId: string;
  side: 'left' | 'right';
}

export interface PinSetPayload {
  left: string[];
  right: string[];
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
