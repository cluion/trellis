import type { ColumnDef } from './column';
import type { DataRow, DataId } from './data';
import type {
    EventHandler,
    EventPayloadArgs,
    TrellisEventMap,
    UnknownEvent,
} from './event';
import type { TransformFn } from './pipeline';
import type { SlotRenderer } from './slot';
import type { TableState } from './state';

/**
 * 暴露給插件和框架適配器的 API。
 * 這是 Trellis 實例的公開介面。
 */
export interface TrellisAPI<T = Record<string, unknown>> {
    /** 取得目前不可變的狀態快照 */
    getState: () => TableState<T>;
    /** 透過更新函式更新狀態（產生新的不可變狀態） */
    setState: (
        updater: (prev: TableState<T>) => Partial<TableState<T>>,
    ) => void;
    /** 訂閱狀態變更。回傳取消訂閱函式。 */
    subscribe: (listener: (state: TableState<T>) => void) => () => void;
    /** 訂閱事件。回傳取消訂閱函式。 */
    on<K extends keyof TrellisEventMap>(
        event: K,
        handler: (payload: TrellisEventMap[K]) => void,
    ): () => void;
    /** 訂閱未登記在 TrellisEventMap 的事件，payload 為 unknown。 */
    on<E extends string>(
        event: UnknownEvent<E>,
        handler: EventHandler,
    ): () => void;
    /** 發送事件並附帶 payload */
    emit<K extends keyof TrellisEventMap>(
        event: K,
        ...args: EventPayloadArgs<TrellisEventMap[K]>
    ): void;
    /** 發送未登記在 TrellisEventMap 的事件。 */
    emit<E extends string>(event: UnknownEvent<E>, payload?: unknown): void;
    /** 註冊插槽渲染器。回傳取消註冊函式。 */
    registerSlot: (name: string, renderer: SlotRenderer) => () => void;
    /** 依名稱取得已註冊的插槽渲染器 */
    getSlot: (name: string) => SlotRenderer | undefined;
    /** 註冊管線轉換函式 */
    registerTransform: (
        name: string,
        priority: number,
        fn: TransformFn<T>,
    ) => void;
    /** 重跑管線，可合併狀態更新 */
    recompute: (withState?: Partial<TableState<T>>) => void;
    /** 替換原始資料並重跑管線 */
    updateSourceData: (data: T[]) => void;
    /** 新增一筆資料到 sourceData 末端，重跑管線 */
    addRow: (item: T) => void;
    /** 依 ID 移除一筆資料，重跑管線 */
    removeRow: (id: DataId) => void;
    /** 依 ID 合併更新一筆資料，重跑管線 */
    updateRow: (id: DataId, partial: Partial<T>) => void;
    /** 取得篩選排序後但未分頁的完整資料 */
    getFilteredData: () => DataRow<T>[];
}

/**
 * 插件介面。
 * 插件透過生命週期掛鉤和 API 存取來擴充表格功能。
 */
export interface TrellisPlugin<T = Record<string, unknown>> {
    /** 插件唯一名稱 */
    name: string;
    /** 插件安裝時呼叫。接收完整 API。 */
    install: (api: TrellisAPI<T>) => void;
    /** 表格銷毀或插件被取消註冊時呼叫 */
    destroy?: () => void;
}

/**
 * 建立 Trellis 實例的選項。
 */
export interface TrellisOptions<T = Record<string, unknown>> {
    /** 資料列陣列 */
    data: T[];
    /** 欄位定義 */
    columns: ColumnDef<T>[];
    /**
     * 要註冊的插件。
     * 插件與資料列型別無關（同一個 createSortPlugin() 可用於任何 T），
     * 所以接受任意列型別的插件，讓 TrellisPlugin<Record<string, unknown>> 能用在 Trellis<User>。
     */
    // ponytail: 失去插件與 T 的對應檢查；需要時改成泛型工廠 createXPlugin<T>()
    plugins?: TrellisPlugin<any>[];
    /** 每頁筆數（預設：10） */
    pageSize?: number;
    /** 列 ID 存取器 — 屬性鍵或函式（預設：陣列索引） */
    rowId?: keyof T | ((row: T, index: number) => DataId);
}
