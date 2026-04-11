/**
 * 傳遞給插槽渲染器的 context。
 * 包含自訂渲染器可能需要的所有資料。
 */
export interface SlotContext {
  /** 此儲存格的欄位定義 */
  column?: unknown;
  /** 此儲存格的資料列 */
  row?: unknown;
  /** 解析後的儲存格值 */
  value?: unknown;
  /** 插槽特定的額外資料 */
  [key: string]: unknown;
}

/**
 * 在插槽位置渲染內容的函式。
 * 框架適配器負責將此轉換為原生的渲染方式。
 */
export type SlotRenderer = (
  ctx: SlotContext,
) => unknown;
