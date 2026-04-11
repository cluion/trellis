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
      // 儲存原始資料供重新篩選使用
      let originalData: DataRow[] = [...api.getState().data];

      api.on('filter:change', (payload) => {
        const { query } = payload as { query: string };
        const state = api.getState();

        if (!query) {
          api.setState(() => ({
            data: originalData,
            filtering: { ...state.filtering, query: '' },
          }));
          return;
        }

        const lowerQuery = query.toLowerCase();

        const filtered = originalData.filter((row) => {
          return state.columns.some((column) => {
            const value = getCellValue(row, column);
            if (value == null) return false;
            return String(value).toLowerCase().includes(lowerQuery);
          });
        });

        api.setState(() => ({
          data: filtered,
          filtering: { ...state.filtering, query },
        }));
      });
    },
  };
}
