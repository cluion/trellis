/**
 * 自訂排序函式。
 * 回傳負數表示 a < b，正數表示 a > b，零表示相等。
 */
export type ColumnSortFn<T = unknown> = (
  a: T,
  b: T,
) => number;

/**
 * 單一欄位定義。
 * 泛型 T 為每筆資料列的形狀。
 */
export interface ColumnDef<T = Record<string, unknown>> {
  /** 欄位唯一識別碼 */
  id: string;
  /** T 的屬性鍵，或用來提取值的函式 */
  accessor: keyof T | ((row: T) => unknown);
  /** 欄位標題的顯示文字 */
  header: string;
  /** 自訂排序函式（覆蓋預設） */
  sortFn?: ColumnSortFn;
  /** 此欄位是否可排序（預設：排序插件啟用時為 true） */
  sortable?: boolean;
  /** 此欄位是否可篩選 */
  filterable?: boolean;
  /** 欄位寬度（CSS 值） */
  width?: number | string;
  /** 最小欄位寬度（CSS 值） */
  minWidth?: number | string;
  /** 最大欄位寬度（CSS 值） */
  maxWidth?: number | string;
  /** 儲存格內容對齊方式 */
  align?: 'left' | 'center' | 'right';
  /** 此欄位儲存格的額外 HTML 屬性 */
  attrs?: Record<string, string>;
  /** 自訂儲存格 class 名稱或函式 */
  className?: string | ((row: T, value: unknown) => string);
  /** 此欄位是否可見 */
  visible?: boolean;
  /** 釘選方向：固定在左側或右側 */
  pin?: 'left' | 'right';
  /** 此欄位是否可調整寬度（預設：resizing 插件啟用時為 true） */
  resizable?: boolean;
}
