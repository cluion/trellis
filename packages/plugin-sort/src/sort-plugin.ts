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
        const { sortBy } = state.sorting;
        if (sortBy.length === 0) return data;

        // 預建 columnId → ColumnDef 查找表
        const colMap = new Map(state.columns.map((col) => [col.id, col]));

        return [...data].sort((a, b) => {
          for (const criterion of sortBy) {
            const column = colMap.get(criterion.columnId);
            if (!column || column.sortable === false) continue;

            const valA = getCellValue(a, column);
            const valB = getCellValue(b, column);

            let result: number;
            if (column.sortFn) {
              result = column.sortFn(valA, valB);
            } else {
              result = compareValues(valA, valB);
            }

            if (result !== 0) {
              return criterion.direction === 'desc' ? -result : result;
            }
          }
          return 0;
        });
      });

      // 排序變更 → 重跑管線
      api.on('sort:change', (payload) => {
        const { columnId, direction, append } = payload as {
          columnId: string;
          direction: 'asc' | 'desc' | null;
          append?: boolean;
        };

        const state = api.getState();
        const column = state.columns.find((col) => col.id === columnId);
        if (column && column.sortable === false) return;

        const current = state.sorting.sortBy;
        let next: { columnId: string; direction: 'asc' | 'desc' }[];

        if (direction === null) {
          // 清除模式
          if (append) {
            // 移除單一欄位排序
            next = current.filter((c) => c.columnId !== columnId);
          } else {
            // 清除全部排序
            next = [];
          }
        } else if (append) {
          // 追加模式：移除同欄位既有條件，加到最後
          next = [
            ...current.filter((c) => c.columnId !== columnId),
            { columnId, direction },
          ];
        } else {
          // 取代模式：只保留這一個條件
          next = [{ columnId, direction }];
        }

        api.recompute({ sorting: { sortBy: next } });
      });
    },
  };
}
