import type { TrellisPlugin, TrellisAPI, ColumnDef, DataRow } from '@trellisjs/core';

/**
 * 自動偵測型別並比較兩個值。
 * 支援：字串、數字、布林值、類日期字串。
 */
function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  if (typeof a === 'string' && typeof b === 'string') {
    // 嘗試 ISO 格式字串的日期比較
    if (/^\d{4}-\d{2}-\d{2}/.test(a) && /^\d{4}-\d{2}-\d{2}/.test(b)) {
      return new Date(a).getTime() - new Date(b).getTime();
    }
    return a.localeCompare(b);
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  return String(a).localeCompare(String(b));
}

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
 * 建立排序插件實例。
 */
export function createSortPlugin(): TrellisPlugin {
  return {
    name: 'sort',

    install(api: TrellisAPI) {
      // 註冊管線轉換函式 (priority=20)
      api.registerTransform('sort', 20, (data, state) => {
        const { columnId, direction } = state.sorting;
        if (!columnId || !direction) return data;

        const column = state.columns.find((col) => col.id === columnId);
        if (!column || column.sortable === false) return data;

        return [...data].sort((a, b) => {
          const valA = getCellValue(a, column);
          const valB = getCellValue(b, column);

          let result: number;
          if (column.sortFn) {
            result = column.sortFn(valA, valB);
          } else {
            result = compareValues(valA, valB);
          }

          return direction === 'desc' ? -result : result;
        });
      });

      // 排序變更 → 重跑管線
      api.on('sort:change', (payload) => {
        const { columnId, direction } = payload as {
          columnId: string;
          direction: 'asc' | 'desc' | null;
        };

        const state = api.getState();
        const column = state.columns.find((col) => col.id === columnId);

        if (column && column.sortable === false) return;

        api.recompute({
          sorting: { columnId: direction ? columnId : '', direction: direction ?? null },
        });
      });
    },
  };
}
