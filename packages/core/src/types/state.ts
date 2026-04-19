import type { ColumnDef } from './column';
import type { DataRow, DataId } from './data';
import type { VirtualScrollState } from './virtual-scroll';
import type { ColumnPinningState } from './column-pinning';

/** 單一排序條件 */
export interface SortCriterion {
  /** 排序欄位 */
  columnId: string;
  /** 排序方向 */
  direction: 'asc' | 'desc';
}

/** 目前排序設定 */
export interface SortState {
  /** 排序條件列表，index 0 為主排序；空陣列表示未排序 */
  sortBy: SortCriterion[];
}

/** 目前篩選設定 */
export interface FilterState {
  /** 全域搜尋關鍵字 */
  query: string;
  /** 單欄篩選值 */
  columnFilters: Record<string, unknown>;
}

/** 目前分頁設定 */
export interface PaginationState {
  /** 目前頁碼（從 1 開始） */
  page: number;
  /** 每頁筆數 */
  pageSize: number;
  /** 當前資料總筆數（經排序/篩選後，分頁前） */
  totalItems: number;
}

/**
 * 完整表格狀態。
 * 不可變快照 — 更新時一律建立新物件。
 */
export interface TableState<T = Record<string, unknown>> {
  /** 處理後的資料列 */
  data: DataRow<T>[];
  /** 欄位定義 */
  columns: ColumnDef<T>[];
  /** 排序狀態 */
  sorting: SortState;
  /** 篩選狀態 */
  filtering: FilterState;
  /** 分頁狀態 */
  pagination: PaginationState;
  /** 已選取的列 ID 集合 */
  selection: Set<DataId>;
  /** 欄位可見性：key 為 columnId，值 false 表示隱藏（未定義或 true 表示可見） */
  columnVisibility: Record<string, boolean>;
  /** 虛擬滾動狀態（僅在啟用插件時有值） */
  virtualScroll?: VirtualScrollState;
  /** 欄釘選狀態 */
  columnPinning: ColumnPinningState;
  /** 已展開的行 ID 集合 */
  expandedRows: Set<DataId>;
  /** 行展開設定（由插件安裝時設定） */
  rowExpansion?: {
    mode: 'single' | 'multi';
    expandIcon?: unknown;
    collapseIcon?: unknown;
  };
}
