/** 虛擬滾動狀態 */
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

/** 虛擬滾動插件選項 */
export interface VirtualScrollOptions {
  /** 固定行高 (px)，或 'auto' 自動測量（預設：'auto'） */
  rowHeight?: number | 'auto';
  /** 上下各額外渲染的行數（預設：5） */
  overscan?: number;
}
