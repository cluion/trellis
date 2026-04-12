import type { DataRow } from './data';
import type { TableState } from './state';

/** 純轉換函式 — 接收資料與當前狀態，回傳轉換後的新陣列 */
export type TransformFn<T> = (
  data: DataRow<T>[],
  state: Readonly<TableState<T>>,
) => DataRow<T>[];

/** 管線中的轉換條目 */
export interface TransformEntry<T> {
  /** 轉換名稱（用於除錯） */
  name: string;
  /** 執行優先序，數字越小越先執行 */
  priority: number;
  /** 純轉換函式 */
  fn: TransformFn<T>;
}
