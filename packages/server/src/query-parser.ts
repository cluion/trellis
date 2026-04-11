import type { TrellisServerQuery, WhereClause } from './types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 1000;
const SAFE_COLUMN_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * 從 HTTP 請求參數解析 Trellis 查詢。
 * 支援 JSON body 和 URL query string 兩種格式。
 */
export function parseTrellisQuery(raw: Record<string, unknown>): TrellisServerQuery {
  const page = Math.max(DEFAULT_PAGE, Number(raw.page) || DEFAULT_PAGE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(raw.pageSize) || DEFAULT_PAGE_SIZE),
  );

  let sort: TrellisServerQuery['sort'];
  let filter: TrellisServerQuery['filter'];

  // 解析 sort — 可能是 JSON 字串或物件
  if (raw.sort) {
    const parsed = typeof raw.sort === 'string' ? JSON.parse(raw.sort) : raw.sort;
    if (Array.isArray(parsed)) {
      sort = parsed.filter(
        (s: any) =>
          typeof s.columnId === 'string' &&
          (s.direction === 'asc' || s.direction === 'desc'),
      );
    }
  }

  // 解析 filter — 可能是 JSON 字串或物件
  if (raw.filter) {
    const parsed = typeof raw.filter === 'string' ? JSON.parse(raw.filter) : raw.filter;
    if (parsed && typeof parsed === 'object') {
      filter = parsed as TrellisServerQuery['filter'];
    }
  }

  return { page, pageSize, sort, filter };
}

/**
 * 建構 SQL WHERE 子句。
 * 全域搜尋 → 跨欄 OR；單欄篩選 → AND。
 */
export function buildWhereClause(
  columns: string[],
  filter?: TrellisServerQuery['filter'],
): WhereClause {
  if (!filter) return { sql: '', params: [] };

  const conditions: string[] = [];
  const params: unknown[] = [];

  // 全域搜尋 — 所有欄位 OR
  if (filter.global) {
    const safeColumns = columns.filter((c) => SAFE_COLUMN_RE.test(c));
    const orConditions = safeColumns.map((col) => {
      params.push(`%${filter.global}%`);
      return `${col} LIKE ?`;
    });
    if (orConditions.length > 0) {
      conditions.push(`(${orConditions.join(' OR ')})`);
    }
  }

  // 單欄篩選 — AND
  if (filter.columns) {
    for (const [colId, value] of Object.entries(filter.columns)) {
      if (value == null || value === '') continue;
      if (!SAFE_COLUMN_RE.test(colId)) continue;

      if (typeof value === 'string') {
        conditions.push(`${colId} LIKE ?`);
        params.push(`%${value}%`);
      } else {
        conditions.push(`${colId} = ?`);
        params.push(value);
      }
    }
  }

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/**
 * 建構 SQL ORDER BY 子句。
 * 過濾不安全的欄位名稱防止 SQL injection。
 */
export function buildOrderByClause(
  sort?: TrellisServerQuery['sort'],
): string {
  if (!sort || sort.length === 0) return '';

  const clauses = sort
    .filter((s) => SAFE_COLUMN_RE.test(s.columnId))
    .map((s) => `${s.columnId} ${s.direction === 'desc' ? 'DESC' : 'ASC'}`);

  return clauses.length > 0 ? `ORDER BY ${clauses.join(', ')}` : '';
}
