/** 虛擬滾動狀態（Core 層型別定義） */
export interface VirtualScrollState {
  /** 可視區域起始索引（含 overscan） */
  startIndex: number;
  /** 可視區域結束索引（含 overscan） */
  endIndex: number;
  /** 全部資料的總高度 (px) */
  totalHeight: number;
  /** 單行高度 (px) */
  rowHeight: number;
}
