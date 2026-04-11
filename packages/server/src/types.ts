/** Trellis 查詢（後端解析後的結構） */
export interface TrellisServerQuery {
  page: number;
  pageSize: number;
  sort?: { columnId: string; direction: 'asc' | 'desc' }[];
  filter?: { global?: string; columns?: Record<string, unknown> };
}

/** WHERE 子句建構結果 */
export interface WhereClause {
  sql: string;
  params: unknown[];
}
