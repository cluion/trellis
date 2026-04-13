import type { TrellisPlugin, TrellisAPI, DataId } from '@trellisjs/core';

/**
 * 建立 selection 插件實例。
 * 支援單選切換、全選/取消全選、Shift 範圍選。
 */
export function createSelectionPlugin(): TrellisPlugin {
  return {
    name: 'selection',

    install(api: TrellisAPI) {
      let anchorIndex: number | null = null;

      // 切換單列選取
      api.on('selection:toggle', (payload) => {
        const { rowId } = payload as { rowId: DataId };
        const state = api.getState();
        const next = new Set(state.selection);
        if (next.has(rowId)) {
          next.delete(rowId);
        } else {
          next.add(rowId);
        }

        // 更新 anchor 為此列在 state.data 中的索引
        const idx = state.data.findIndex((row) => row.id === rowId);
        anchorIndex = idx >= 0 ? idx : null;

        api.setState(() => ({ selection: next }));
      });

      // 全選 / 取消全選（針對當前 state.data）
      api.on('selection:all', (payload) => {
        const { select } = payload as { select: boolean };
        const state = api.getState();

        if (select) {
          const next = new Set<DataId>(state.data.map((row) => row.id));
          api.setState(() => ({ selection: next }));
        } else {
          api.setState(() => ({ selection: new Set<DataId>() }));
        }

        anchorIndex = null;
      });

      // Shift 範圍選（從 anchor 到 toIndex 之間的所有列）
      api.on('selection:range', (payload) => {
        const { toIndex } = payload as { toIndex: number };
        const state = api.getState();

        if (anchorIndex === null) {
          // 沒有 anchor，只選取 toIndex 那一列
          if (toIndex >= 0 && toIndex < state.data.length) {
            const next = new Set<DataId>([state.data[toIndex].id]);
            api.setState(() => ({ selection: next }));
            anchorIndex = toIndex;
          }
          return;
        }

        const start = Math.min(anchorIndex, toIndex);
        const end = Math.max(anchorIndex, toIndex);
        const clampedEnd = Math.min(end, state.data.length - 1);

        const next = new Set<DataId>();
        for (let i = start; i <= clampedEnd; i++) {
          next.add(state.data[i].id);
        }

        api.setState(() => ({ selection: next }));
      });

      // 管線變更時清除不在當前 data 中的 selection ID
      api.subscribe((state) => {
        const currentIds = new Set<DataId>(state.data.map((row) => row.id));
        const prev = api.getState().selection;
        const cleaned = new Set<DataId>(
          [...prev].filter((id) => currentIds.has(id)),
        );

        if (cleaned.size !== prev.size) {
          api.setState(() => ({ selection: cleaned }));
        }
      });
    },
  };
}
