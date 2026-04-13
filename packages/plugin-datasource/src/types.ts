import type { TrellisAPI } from '@trellisjs/core';

/**
 * Trellis 標準查詢協定 — 前端向後端發送的查詢格式。
 * 簡潔、可移植、不依賴任何後端框架。
 */
export interface TrellisQuery {
  /** 目前頁碼（從 1 開始） */
  page: number;
  /** 每頁筆數 */
  pageSize: number;
  /** 排序條件 */
  sort?: TrellisSortQuery[];
  /** 篩選條件 */
  filter?: TrellisFilterQuery;
}

/** 單一排序條件 */
export interface TrellisSortQuery {
  columnId: string;
  direction: 'asc' | 'desc';
}

/** 篩選條件 */
export interface TrellisFilterQuery {
  /** 全域搜尋關鍵字 */
  global?: string;
  /** 單欄篩選值 */
  columns?: Record<string, unknown>;
}

/**
 * 後端標準回應格式。
 * 所有 server-side 模式的後端都必須回傳這個結構。
 */
export interface TrellisResponse<T = Record<string, unknown>> {
  /** 當前頁的資料列 */
  data: T[];
  /** 總筆數（未篩選） */
  total: number;
  /** 篩選後筆數 */
  filtered: number;
}

/**
 * 資料源介面 — 所有資料源都要實作這個介面。
 */
export interface TrellisDatasource<T = Record<string, unknown>> {
  /** 根據查詢條件取得資料 */
  fetch(query: TrellisQuery): Promise<TrellisResponse<T>>;
}

/**
 * 遠端資料源設定
 */
export interface RemoteDatasourceOptions {
  /** API 端點 URL */
  url: string;
  /** HTTP 方法（預設 POST） */
  method?: 'GET' | 'POST';
  /** 自訂請求標頭 */
  headers?: Record<string, string>;
  /** 自訂查詢轉換（發送前處理） */
  transformQuery?: (query: TrellisQuery) => unknown;
  /** 自訂回應轉換（接收後處理） */
  transformResponse?: (response: unknown) => TrellisResponse;
}

/**
 * 從 Trellis 狀態建構查詢物件
 */
export function buildQueryFromState(api: TrellisAPI): TrellisQuery {
  const state = api.getState();
  const query: TrellisQuery = {
    page: state.pagination.page,
    pageSize: state.pagination.pageSize,
  };

  if (state.sorting.sortBy.length > 0) {
    query.sort = state.sorting.sortBy;
  }

  if (state.filtering.query || Object.keys(state.filtering.columnFilters).length > 0) {
    query.filter = {};
    if (state.filtering.query) {
      query.filter.global = state.filtering.query;
    }
    if (Object.keys(state.filtering.columnFilters).length > 0) {
      query.filter.columns = { ...state.filtering.columnFilters };
    }
  }

  return query;
}
