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
 * 支援跨所有欄位的全域搜尋與單欄篩選。
 */
export function createFilterPlugin(): TrellisPlugin {
  return {
    name: 'filter',

    install(api: TrellisAPI) {
      // 註冊管線轉換函式 (priority=10)
      api.registerTransform('filter', 10, (data, state) => {
        const query = state.filtering.query;
        const columnFilters = state.filtering.columnFilters;
        const hasGlobalQuery = !!query;
        const hasColumnFilters =
          columnFilters && Object.keys(columnFilters).length > 0;

        if (!hasGlobalQuery && !hasColumnFilters) return data;

        const lowerQuery = hasGlobalQuery ? query!.toLowerCase() : '';

        // 建立欄位 ID → ColumnDef 映射，供單欄篩選查詢
        const colMap = new Map(state.columns.map((col) => [col.id, col]));

        return data.filter((row) => {
          // 全域搜尋：任何欄位包含關鍵字
          if (hasGlobalQuery) {
            const globalMatch = state.columns.some((column) => {
              const value = getCellValue(row, column);
              if (value == null) return false;
              return String(value).toLowerCase().includes(lowerQuery);
            });
            if (!globalMatch) return false;
          }

          // 單欄篩選：每個設定值都必須匹配
          if (hasColumnFilters) {
            for (const [columnId, filterValue] of Object.entries(columnFilters)) {
              if (!filterValue) continue; // 空值跳過
              const column = colMap.get(columnId);
              if (!column) continue;
              const cellValue = getCellValue(row, column);
              if (cellValue == null) return false;
              const lowerCell = String(cellValue).toLowerCase();
              const lowerFilter = String(filterValue).toLowerCase();
              if (!lowerCell.includes(lowerFilter)) return false;
            }
          }

          return true;
        });
      });

      // 篩選關鍵字變更 → 重跑管線
      api.on('filter:change', (payload) => {
        const { query } = payload as { query: string };
        const state = api.getState();
        api.recompute({ filtering: { ...state.filtering, query } });
      });

      // 單欄篩選變更 → 重跑管線
      api.on('filter:column', (payload) => {
        const { columnId, value } = payload as {
          columnId: string;
          value: string;
        };
        const state = api.getState();
        const { columnFilters } = state.filtering;
        const nextColumnFilters =
          value !== ''
            ? { ...columnFilters, [columnId]: value }
            : (() => {
                // 清除該欄篩選
                const { [columnId]: _, ...rest } = columnFilters;
                return rest;
              })();
        api.recompute({
          filtering: { ...state.filtering, columnFilters: nextColumnFilters },
        });
      });
    },
  };
}
