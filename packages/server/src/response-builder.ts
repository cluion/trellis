import type { TrellisServerQuery } from './types';

/**
 * 標準回應建構器。
 * 後端用這個函式產生符合 Trellis 協定的回應。
 */
export function buildResponse<T>(
  data: T[],
  options: {
    total: number;
    filtered: number;
    query: TrellisServerQuery;
  },
): {
  data: T[];
  total: number;
  filtered: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const totalPages = Math.max(1, Math.ceil(options.filtered / options.query.pageSize));
  return {
    data,
    total: options.total,
    filtered: options.filtered,
    page: options.query.page,
    pageSize: options.query.pageSize,
    totalPages,
  };
}
