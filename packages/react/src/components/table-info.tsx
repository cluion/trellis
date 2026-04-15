import { useTrellisContext } from '../context';

type FormatFn = (info: { start: number; end: number; total: number }) => React.ReactNode;

interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface TableInfoProps {
  /** 格式化字串模板或 render 函式。預設："Showing {start} to {end} of {total} entries" */
  format?: string | FormatFn;
  /**
   * 外部傳入的 pagination 資料。
   * 若未提供，會從 TrellisContext 讀取。
   */
  pagination?: PaginationState;
}

const DEFAULT_FORMAT = 'Showing {start} to {end} of {total} entries';

function computeInfo(pagination: PaginationState) {
  const { page, pageSize, totalItems: total } = pagination;
  const start = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = total > 0 ? Math.min(page * pageSize, total) : 0;
  return { start, end, total };
}

/**
 * 表格資訊列元件。
 * 顯示當前分頁的資料範圍（第 X 到 Y 筆，共 Z 筆）。
 */
export function TableInfo({ format = DEFAULT_FORMAT, pagination }: TableInfoProps) {
  const pg = pagination ?? useTrellisContext().getState().pagination;
  const { start, end, total } = computeInfo(pg);

  if (typeof format === 'function') {
    return <>{format({ start, end, total })}</>;
  }

  const text = format
    .replace('{start}', String(start))
    .replace('{end}', String(end))
    .replace('{total}', String(total));

  return <>{text}</>;
}
