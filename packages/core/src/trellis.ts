import { EventBus } from './event/event-bus';
import { StateStore } from './state/store';
import { SlotRegistry } from './slot/slot-registry';
import { PluginManager } from './plugin/plugin-manager';
import type { TableState } from './types/state';
import type { DataRow, DataId } from './types/data';
import type { TrellisAPI, TrellisOptions } from './types/plugin';
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

  constructor(options: TrellisOptions<T>) {
    this.options = options;
    this.eventBus = new EventBus();
    this.slotRegistry = new SlotRegistry();

    const initialState: TableState<T> = {
      data: this.processData(options.data),
      columns: options.columns,
      sorting: { columnId: '', direction: null },
      filtering: { query: '', columnFilters: {} },
      pagination: { page: 1, pageSize: options.pageSize ?? 10, totalItems: options.data.length },
      selection: new Set(),
    };

    this.store = new StateStore(initialState);
    this._api = this.buildAPI();
    this.pluginManager = new PluginManager(this._api);

    // 所有系統初始化完成後再註冊插件
    options.plugins?.forEach((plugin) => this.pluginManager.register(plugin));
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
