/** 資料列的唯一識別碼 */
export type DataId = string | number;

/**
 * 資料列的內部表示法。
 * 將使用者的原始資料物件包裝上詮釋資料。
 */
export interface DataRow<T = Record<string, unknown>> {
  /** 此列的唯一識別碼 */
  id: DataId;
  /** 使用者提供的原始資料物件 */
  original: T;
  /** 此列在原始資料陣列中的索引 */
  index: number;
}
