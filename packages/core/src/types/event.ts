import type { DataId } from './data';

/**
 * 事件處理器回呼函式。
 * 接收一個選擇性的 payload。
 */
export type EventHandler = (payload: unknown) => void;

/**
 * 事件名稱 → payload 型別。
 * 插件以 module augmentation 登記自己的事件：
 *
 * ```ts
 * declare module '@trellisjs/core' {
 *     interface TrellisEventMap {
 *         'sort:change': SortChangePayload;
 *     }
 * }
 * ```
 *
 * 沒有 payload 的指令登記為 `void`。
 */
export interface TrellisEventMap {
    'data:added': DataId;
    'data:removed': DataId;
    'data:updated': DataId;
}

/** 不在事件表裡的事件名稱；已知事件不會落到寬鬆的 overload。 */
export type UnknownEvent<E extends string> = E extends keyof TrellisEventMap
    ? never
    : E;

/**
 * emit 的 payload 參數：
 * - `void` 事件：可省略，傳什麼都接受（相容既有的 `null`、`{}` 寫法）
 * - 含 `undefined` 的事件：可省略，有傳就檢查型別
 * - 其他事件：必填並檢查型別
 */
export type EventPayloadArgs<P> = [P] extends [void]
    ? [payload?: unknown]
    : undefined extends P
      ? [payload?: P]
      : [payload: P];
