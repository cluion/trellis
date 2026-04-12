import type { TrellisPlugin, TrellisAPI, ColumnDef, DataRow } from '@trellisjs/core';

/**
 * 從列和欄位解析儲存格的值。
 */
function getCellValue<T>(row: DataRow<T>, column: ColumnDef<T>): unknown {
  const { accessor } = column;
  if (typeof accessor === 'function') {
    return accessor(row.original);
  }
  return row.original[accessor];
}

/**
 * 建立篩選插件實例。
 * 支援跨所有欄位的全域搜尋。
 */
export function createFilterPlugin(): TrellisPlugin {
  return {
    name: 'filter',

    install(api: TrellisAPI) {
      // 註冊管線轉換函式 (priority=10)
      api.registerTransform('filter', 10, (data, state) => {
        const query = state.filtering.query;
        if (!query) return data;

        const lowerQuery = query.toLowerCase();
        return data.filter((row) => {
          return state.columns.some((column) => {
            const value = getCellValue(row, column);
            if (value == null) return false;
            return String(value).toLowerCase().includes(lowerQuery);
          });
        });
      });

      // 篩選關鍵字變更 → 重跑管線
      api.on('filter:change', (payload) => {
        const { query } = payload as { query: string };
        const state = api.getState();
        api.recompute({ filtering: { ...state.filtering, query } });
      });
    },
  };
}
