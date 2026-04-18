import { EventBus } from './event/event-bus';
import { StateStore } from './state/store';
import { SlotRegistry } from './slot/slot-registry';
import { PluginManager } from './plugin/plugin-manager';
import type { TableState } from './types/state';
import type { DataRow, DataId } from './types/data';
import type { TrellisAPI, TrellisOptions } from './types/plugin';
import type { TransformEntry } from './types/pipeline';
import type { EventHandler } from './types/event';
import type { SlotRenderer } from './types/slot';

/**
 * Trellis — 無頭式資料表格引擎。
 *
 * 管理狀態、事件、插件和插槽。
 * 框架無關：渲染由適配器處理。
 */
export class Trellis<T extends Record<string, unknown> = Record<string, unknown>> {
  private store: StateStore<TableState<T>>;
  private eventBus: EventBus;
  private pluginManager: PluginManager<T>;
  private slotRegistry: SlotRegistry;
  private options: TrellisOptions<T>;
  private _api: TrellisAPI<T>;
  private sourceData: DataRow<T>[];
  private transforms: TransformEntry<T>[];
  private pipelineLock: boolean;

  constructor(options: TrellisOptions<T>) {
    this.options = options;
    this.eventBus = new EventBus();
    this.slotRegistry = new SlotRegistry();
    this.sourceData = this.processData(options.data);
    this.transforms = [];
    this.pipelineLock = false;

    const initialState: TableState<T> = {
      data: [...this.sourceData],
      columns: options.columns,
      sorting: { sortBy: [] },
      filtering: { query: '', columnFilters: {} },
      pagination: { page: 1, pageSize: options.pageSize ?? 10, totalItems: options.data.length },
      selection: new Set(),
      columnVisibility: {},
      columnPinning: { left: [], right: [] },
    };

    this.store = new StateStore(initialState);
    this._api = this.buildAPI();
    this.pluginManager = new PluginManager(this._api);

    // 所有系統初始化完成後再註冊插件
    options.plugins?.forEach((plugin) => this.pluginManager.register(plugin));

    // 插件註冊完成後執行管線，確保初始 state.data 正確
    this.runPipeline();
  }

  /**
   * 將原始資料陣列處理為 DataRow 物件。
   */
  private processData(data: T[]): DataRow<T>[] {
    return data.map((original, index) => ({
      id: this.resolveRowId(original, index),
      original,
      index,
    }));
  }

  /**
   * 根據 options.rowId 解析列的 ID。
   */
  private resolveRowId(row: T, index: number): DataId {
    const { rowId } = this.options;
    if (!rowId) return String(index);
    if (typeof rowId === 'function') return rowId(row, index);
    const value = row[rowId];
    return value != null ? String(value) : String(index);
  }

  /**
   * 執行 Transform Pipeline。
   * 若提供 withState，先合併到 store（不觸發通知），再從 sourceData 重跑所有 transform。
   */
  private runPipeline(withState?: Partial<TableState<T>>): void {
    if (this.pipelineLock) return;
    this.pipelineLock = true;

    try {
      // 合併狀態（直接寫入 store，不觸發通知）
      if (withState) {
        this.store.setState(() => withState);
      }

      const state = this.store.getState() as TableState<T>;
      const sorted = [...this.transforms].sort((a, b) => a.priority - b.priority);

      let data: DataRow<T>[] = [...this.sourceData];
      let effectiveState = state;

      if (sorted.length > 0) {
        // 找到 pagination transform 的位置
        const paginationIndex = sorted.findIndex((t) => t.name === 'pagination');

        if (paginationIndex !== -1) {
          // 階段一：執行 pagination 之前的所有 transform → 取得 totalItems
          for (let i = 0; i < paginationIndex; i++) {
            data = sorted[i].fn(data, state);
          }

          const totalItems = data.length;

          // 校正頁碼：避免刪除/篩選後 page 超出 totalPages
          const totalPages = Math.max(1, Math.ceil(totalItems / state.pagination.pageSize));
          const clampedPage = Math.min(state.pagination.page, totalPages);

          if (clampedPage !== state.pagination.page) {
            effectiveState = { ...state, pagination: { ...state.pagination, page: clampedPage } };
          }

          // 階段二：執行 pagination transform（用校正後的頁碼）
          data = sorted[paginationIndex].fn(data, effectiveState);

          // 階段三：執行 pagination 之後的所有 transform（如 virtualScroll）
          for (let i = paginationIndex + 1; i < sorted.length; i++) {
            data = sorted[i].fn(data, effectiveState);
          }

          // 一次 setState 寫入結果
          this.store.setState(() => ({
            data,
            pagination: { ...effectiveState.pagination, totalItems, page: clampedPage },
          }));
        } else {
          // 沒有 pagination transform，依序執行所有 transform
          for (const transform of sorted) {
            data = transform.fn(data, state);
          }

          this.store.setState(() => ({
            data,
            pagination: { ...state.pagination, totalItems: this.sourceData.length },
          }));
        }
      } else {
        this.store.setState(() => ({
          data,
          pagination: { ...state.pagination, totalItems: data.length },
        }));
      }
    } finally {
      this.pipelineLock = false;
    }
  }

  /**
   * 建構暴露給插件和適配器的公開 API 物件。
   */
  private buildAPI(): TrellisAPI<T> {
    return {
      getState: () => this.store.getState() as TableState<T>,
      setState: (updater) => this.store.setState(updater as (prev: TableState<T>) => Partial<TableState<T>>),
      subscribe: (listener) =>
        this.store.subscribe(listener as (state: TableState<T>) => void),
      on: (event: string, handler: EventHandler) =>
        this.eventBus.on(event, handler),
      emit: (event: string, payload: unknown) =>
        this.eventBus.emit(event, payload),
      registerSlot: (name: string, renderer: SlotRenderer) =>
        this.slotRegistry.register(name, renderer),
      getSlot: (name: string) => this.slotRegistry.get(name),
      registerTransform: (name, priority, fn) => {
        this.transforms.push({ name, priority, fn });
      },
      recompute: (withState) => {
        this.runPipeline(withState);
      },
      updateSourceData: (data) => {
        this.sourceData = this.processData(data);
        this.runPipeline();
      },
      addRow: (item) => {
        const index = this.sourceData.length;
        const row: DataRow<T> = {
          id: this.resolveRowId(item, index),
          original: item,
          index,
        };
        this.sourceData = [...this.sourceData, row];
        this.runPipeline();
        this.eventBus.emit('data:added', row.id);
      },
      removeRow: (id) => {
        const index = this.sourceData.findIndex((row) => row.id === id);
        if (index === -1) return;
        this.sourceData = this.sourceData.filter((row) => row.id !== id);
        this.runPipeline();
        this.eventBus.emit('data:removed', id);
      },
      updateRow: (id, partial) => {
        const index = this.sourceData.findIndex((row) => row.id === id);
        if (index === -1) return;
        this.sourceData = this.sourceData.map((row) =>
          row.id === id
            ? { ...row, original: { ...row.original, ...partial } as T }
            : row,
        );
        this.runPipeline();
        this.eventBus.emit('data:updated', id);
      },
    };
  }

  /** 適配器和插件使用的公開 API。 */
  get api(): TrellisAPI<T> {
    return this._api;
  }

  /** 銷毀實例 — 清除插件和事件監聽器。 */
  destroy(): void {
    this.pluginManager.destroyAll();
    this.eventBus.clear();
  }
}
