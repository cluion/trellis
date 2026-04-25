/** 欄寬調整狀態 */
export interface ColumnResizingState {
  /** 各欄寬度（px），key 為 columnId */
  columnWidths: Record<string, number>;
  /** 正在拖曳調整的欄位 ID，null 表示未拖曳 */
  resizingColumn: string | null;
  /** 最小寬度（px） */
  minWidth: number;
  /** 預設寬度（px） */
  defaultWidth: number;
  /** 最大寬度（px），undefined 表示不限制 */
  maxWidth?: number;
}
