import type { TrellisDatasource, TrellisQuery, TrellisResponse } from './types';

interface StaticDatasourceOptions<T> {
  /** 自訂欄位值提取函式 */
  columnAccessors?: Record<string, (row: T) => unknown>;
}

/**
 * 建立靜態（本地）資料源。
 * 在本地執行排序、篩選、分頁 — 不需要後端。
 */
export function createStaticDatasource<T extends Record<string, unknown>>(
  data: T[],
  options?: StaticDatasourceOptions<T>,
): TrellisDatasource<T> {
  const columnAccessors = options?.columnAccessors ?? {};

  function getValue(row: T, columnId: string): unknown {
    if (columnAccessors[columnId]) {
      return columnAccessors[columnId](row);
    }
    return row[columnId];
  }

  function compareValues(a: unknown, b: unknown): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  }

  return {
    async fetch(query: TrellisQuery): Promise<TrellisResponse<T>> {
      let result = [...data];
      const total = data.length;

      // 篩選 — 全域搜尋
      if (query.filter?.global) {
        const keyword = query.filter.global.toLowerCase();
        result = result.filter((row) =>
          Object.values(row).some((val) =>
            val != null && String(val).toLowerCase().includes(keyword),
          ),
        );
      }

      // 篩選 — 單欄篩選
      if (query.filter?.columns) {
        for (const [colId, filterVal] of Object.entries(query.filter.columns)) {
          if (filterVal == null || filterVal === '') continue;
          const keyword = String(filterVal).toLowerCase();
          result = result.filter((row) => {
            const val = getValue(row, colId);
            return val != null && String(val).toLowerCase().includes(keyword);
          });
        }
      }

      const filtered = result.length;

      // 排序
      if (query.sort) {
        for (const sort of query.sort) {
          result.sort((a, b) => {
            const valA = getValue(a, sort.columnId);
            const valB = getValue(b, sort.columnId);
            const cmp = compareValues(valA, valB);
            return sort.direction === 'desc' ? -cmp : cmp;
          });
        }
      }

      // 分頁
      const start = (query.page - 1) * query.pageSize;
      const end = start + query.pageSize;
      const paged = result.slice(start, end);

      return { data: paged, total, filtered };
    },
  };
}
