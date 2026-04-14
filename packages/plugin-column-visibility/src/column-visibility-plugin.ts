import type { TrellisPlugin, TrellisAPI } from '@trellisjs/core';

/**
 * 建立欄可見性插件實例。
 * 支援動態顯示/隱藏欄位，透過 state.columnVisibility 管理。
 */
export function createColumnVisibilityPlugin(): TrellisPlugin {
  return {
    name: 'column-visibility',

    install(api: TrellisAPI) {
      // column:toggle — 切換欄位可見性
      api.on('column:toggle', (payload) => {
        const { columnId } = payload as { columnId: string };
        const state = api.getState();
        const current = state.columnVisibility[columnId];
        const next = current === false ? true : false;
        api.setState((prev) => ({
          ...prev,
          columnVisibility: { ...prev.columnVisibility, [columnId]: next },
        }));
      });

      // column:show — 顯示欄位
      api.on('column:show', (payload) => {
        const { columnId } = payload as { columnId: string };
        const state = api.getState();
        if (state.columnVisibility[columnId] !== false) return;
        api.setState((prev) => ({
          ...prev,
          columnVisibility: { ...prev.columnVisibility, [columnId]: true },
        }));
      });

      // column:hide — 隱藏欄位
      api.on('column:hide', (payload) => {
        const { columnId } = payload as { columnId: string };
        const state = api.getState();
        if (state.columnVisibility[columnId] === false) return;
        api.setState((prev) => ({
          ...prev,
          columnVisibility: { ...prev.columnVisibility, [columnId]: false },
        }));
      });
    },
  };
}
