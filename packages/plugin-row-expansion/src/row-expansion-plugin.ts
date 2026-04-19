import type { TrellisPlugin, TrellisAPI, DataId, TableState } from '@trellisjs/core';

export interface RowExpansionOptions {
  /** 展開模式：'single'（accordion，一次只展開一行）或 'multi'（可同時展開多行） */
  mode?: 'single' | 'multi';
  /** 自訂展開圖示（框架特定，如 React 節點） */
  expandIcon?: unknown;
  /** 自訂收合圖示（框架特定，如 React 節點） */
  collapseIcon?: unknown;
}

export interface RowExpansionPlugin extends TrellisPlugin {
  /** 取得目前模式 */
  getMode(): 'single' | 'multi';
}

interface TogglePayload {
  rowId: DataId;
}

/**
 * 建立 row-expansion 插件實例。
 * 行展開是純 UI 狀態管理，不註冊 transform。
 */
export function createRowExpansionPlugin(options?: RowExpansionOptions): RowExpansionPlugin {
  const mode = options?.mode ?? 'single';
  const { expandIcon, collapseIcon } = options ?? {};
  const unsubscribers: (() => void)[] = [];

  const plugin: RowExpansionPlugin = {
    name: 'row-expansion',

    install(api: TrellisAPI) {

      // 標記插件已啟用，設定模式和自訂圖示
      api.setState(() => ({ rowExpansion: { mode, expandIcon, collapseIcon } }));

      // expansion:toggle — 切換展開/收合
      const unsubToggle = api.on('expansion:toggle', (payload) => {
        const { rowId } = payload as TogglePayload;
        const current = api.getState().expandedRows;
        const isExpanded = current.has(rowId);

        if (mode === 'single') {
          if (isExpanded) {
            api.setState(() => ({ expandedRows: new Set() }));
          } else {
            api.setState(() => ({ expandedRows: new Set([rowId]) }));
          }
        } else {
          const next = new Set(current);
          if (isExpanded) {
            next.delete(rowId);
          } else {
            next.add(rowId);
          }
          api.setState(() => ({ expandedRows: next }));
        }
      });
      unsubscribers.push(unsubToggle);

      // expansion:expand — 展開指定行
      const unsubExpand = api.on('expansion:expand', (payload) => {
        const { rowId } = payload as TogglePayload;
        if (mode === 'single') {
          api.setState(() => ({ expandedRows: new Set([rowId]) }));
        } else {
          const next = new Set(api.getState().expandedRows);
          next.add(rowId);
          api.setState(() => ({ expandedRows: next }));
        }
      });
      unsubscribers.push(unsubExpand);

      // expansion:collapse — 收合指定行
      const unsubCollapse = api.on('expansion:collapse', (payload) => {
        const { rowId } = payload as TogglePayload;
        const next = new Set(api.getState().expandedRows);
        next.delete(rowId);
        api.setState(() => ({ expandedRows: next }));
      });
      unsubscribers.push(unsubCollapse);

      // expansion:expandAll — 展開所有行（僅 multi 模式）
      const unsubExpandAll = api.on('expansion:expandAll', () => {
        if (mode !== 'multi') return;
        const state = api.getState();
        const allIds = state.data.map((row) => row.id);
        api.setState(() => ({ expandedRows: new Set(allIds) }));
      });
      unsubscribers.push(unsubExpandAll);

      // expansion:collapseAll — 收合所有行
      const unsubCollapseAll = api.on('expansion:collapseAll', () => {
        api.setState(() => ({ expandedRows: new Set() }));
      });
      unsubscribers.push(unsubCollapseAll);

      // 訂閱 state 變更，清理不在 data 中的展開行
      const unsubSubscribe = api.subscribe((state: TableState) => {
        const currentExpanded = state.expandedRows;
        if (currentExpanded.size === 0) return;

        const dataIds = new Set(state.data.map((row) => row.id));
        const cleaned = new Set<DataId>();
        for (const id of currentExpanded) {
          if (dataIds.has(id)) {
            cleaned.add(id);
          }
        }

        if (cleaned.size !== currentExpanded.size) {
          api.setState(() => ({ expandedRows: cleaned }));
        }
      });
      unsubscribers.push(unsubSubscribe);
    },

    destroy() {
      unsubscribers.forEach((unsub) => unsub());
      unsubscribers.length = 0;
    },

    getMode() {
      return mode;
    },
  };

  return plugin;
}
