import { EventBus } from './event/event-bus';
import { PluginManager } from './plugin/plugin-manager';
import { SlotRegistry } from './slot/slot-registry';
import { createSnapshotter } from './state/snapshot';
import { StateStore } from './state/store';
import type { DataRow, DataId } from './types/data';
import type { EventHandler } from './types/event';
import type { TransformEntry, TransformResult } from './types/pipeline';
import type { TrellisAPI, TrellisOptions } from './types/plugin';
import type { SlotRenderer } from './types/slot';
import type { TableState } from './types/state';

/**
 * priority 大於等於此值的 transform 視為切片（pagination 為 30、virtualScroll 為 35），
 * 只影響畫面上的 state.data，不影響 totalItems 與 getFilteredData()。
 */
const SLICE_PRIORITY = 30;

/**
 * Trellis — 無頭式資料表格引擎。
 *
 * 管理狀態、事件、插件和插槽。
 * 框架無關：渲染由適配器處理。
 */
export class Trellis<T extends object = Record<string, unknown>> {
    private store: StateStore<TableState<T>>;
    private eventBus: EventBus;
    private pluginManager: PluginManager<T>;
    private slotRegistry: SlotRegistry;
    private options: TrellisOptions<T>;
    private _api: TrellisAPI<T>;
    private sourceData: DataRow<T>[];
    private transforms: TransformEntry<T>[];
    private pipelineLock: boolean;
    private filteredData: DataRow<T>[];
    private externalValues = new WeakSet<object>();
    private ownedRowArrays = new WeakSet<object>();
    private ownedRows = new WeakSet<object>();
    private snapshot = createSnapshotter(
        (value) =>
            this.externalValues.has(value) || this.ownedRowArrays.has(value),
    );
    private transformCache = new WeakMap<
        TransformEntry<T>,
        {
            input: DataRow<T>[];
            dependencies: unknown[];
            result: TransformResult<T>;
        }
    >();
    private nextAutoId = 0;
    private started = false;
    private destroyed = false;

    constructor(options: TrellisOptions<T>) {
        this.options = options;
        this.eventBus = new EventBus();
        this.slotRegistry = new SlotRegistry();
        this.sourceData = this.processData(options.data);
        this.transforms = [];
        this.pipelineLock = false;
        this.filteredData = [...this.sourceData];

        const initialState: TableState<T> = {
            data: [...this.sourceData],
            columns: options.columns,
            sorting: { sortBy: [] },
            filtering: { query: '', columnFilters: {} },
            pagination: {
                page: 1,
                pageSize: options.pageSize ?? 10,
                totalItems: options.data.length,
            },
            selection: new Set(),
            columnVisibility: {},
            columnPinning: { left: [], right: [] },
            expandedRows: new Set(),
        };

        this.store = new StateStore(initialState, this.snapshot);
        this._api = this.buildAPI();
        this.pluginManager = new PluginManager(this._api);

        // 所有系統初始化完成後再註冊插件
        options.plugins?.forEach((plugin) =>
            this.pluginManager.register(plugin),
        );

        // 插件註冊完成後執行管線，確保初始 state.data 正確
        this.runPipeline();

        if (options.autoStart !== false) {
            this.start();
        }
    }

    /**
     * 將原始資料陣列處理為 DataRow 物件。
     */
    private processData(data: T[]): DataRow<T>[] {
        data.forEach((row) => this.externalValues.add(row));
        const ids = data.map((row, index) => this.resolveRowId(row, index));
        const reserved = new Set<string>();

        for (const id of ids) {
            if (id !== undefined) {
                this.reserveRowId(id, reserved);
            }
        }

        return this.snapshotRows(
            data.map((original, index) => ({
                id: ids[index] ?? this.allocateRowId(reserved),
                original,
                index,
            })),
        );
    }

    /**
     * 根據 options.rowId 解析列的 ID。
     */
    private resolveRowId(row: T, index: number): DataId | undefined {
        const { rowId } = this.options;

        if (rowId == null) {
            return undefined;
        }

        const value =
            typeof rowId === 'function' ? rowId(row, index) : row[rowId];

        if (value == null && typeof rowId !== 'function') {
            return undefined;
        }

        if (
            (typeof value !== 'string' && typeof value !== 'number') ||
            (typeof value === 'number' && !Number.isFinite(value))
        ) {
            throw new TypeError('Row IDs must be strings or finite numbers.');
        }

        return typeof rowId === 'function' ? value : String(value);
    }

    private reserveRowId(id: DataId, reserved: Set<string>): void {
        if (reserved.has(String(id))) {
            throw new TypeError('Duplicate row ID.');
        }

        reserved.add(String(id));
    }

    private allocateRowId(reserved: Set<string>): string {
        let id: string;

        do {
            if (!Number.isSafeInteger(this.nextAutoId)) {
                throw new RangeError('Automatic row ID range exhausted.');
            }

            id = String(this.nextAutoId++);
        } while (reserved.has(id));

        reserved.add(id);

        return id;
    }

    /**
     * 執行 Transform Pipeline。
     * 若提供 withState，先合併到 store（不觸發通知），再從 sourceData 重跑所有 transform。
     */
    private runPipeline(
        withState?: Partial<TableState<T>>,
        reuseCache = false,
    ): void {
        if (this.pipelineLock) {
            return;
        }

        this.pipelineLock = true;

        try {
            withState = this.normalizeUpdate(withState);
            // withState 只在最後一次 setState 寫入，subscriber 不會看到資料還沒更新的中間狀態
            let state = this.snapshot({
                ...this.store.getState(),
                ...withState,
            } as TableState<T>);
            const sorted = [...this.transforms].sort(
                (a, b) => a.priority - b.priority,
            );
            const sliceIndex = sorted.findIndex(
                (t) => t.priority >= SLICE_PRIORITY,
            );
            const shaping =
                sliceIndex === -1 ? sorted : sorted.slice(0, sliceIndex);
            const slicing = sliceIndex === -1 ? [] : sorted.slice(sliceIndex);

            // 階段一：篩選、排序 → 完整結果決定 totalItems 與 getFilteredData
            let data = this.sourceData;

            for (const transform of shaping) {
                const result = this.applyTransform(
                    transform,
                    data,
                    state,
                    reuseCache,
                );
                data = result.data;

                if (result.state) {
                    state = this.snapshot({ ...state, ...result.state });
                }
            }

            this.filteredData = data;

            const remote = state.dataMode === 'server';
            const totalItems = remote
                ? state.pagination.totalItems
                : data.length;

            // 校正頁碼：避免刪除/篩選後 page 超出 totalPages
            const totalPages = Math.max(
                1,
                Math.ceil(totalItems / state.pagination.pageSize),
            );
            const page = remote
                ? state.pagination.page
                : Math.min(state.pagination.page, totalPages);
            let effectiveState: TableState<T> = this.snapshot({
                ...state,
                pagination:
                    state.pagination.page === page &&
                    state.pagination.totalItems === totalItems
                        ? state.pagination
                        : { ...state.pagination, page, totalItems },
            });

            // 階段二：分頁、虛擬滾動等切片 transform（用校正後的頁碼）
            for (const transform of slicing) {
                const result = this.applyTransform(
                    transform,
                    data,
                    effectiveState,
                    reuseCache,
                );
                data = result.data;

                if (result.state) {
                    effectiveState = this.snapshot({
                        ...effectiveState,
                        ...result.state,
                    });
                }
            }

            this.store.setState(() => ({
                ...effectiveState,
                data,
                pagination: effectiveState.pagination,
                virtualScroll: effectiveState.virtualScroll,
            }));
        } finally {
            this.pipelineLock = false;
        }
    }

    private normalizeUpdate(
        update?: Partial<TableState<T>>,
    ): Partial<TableState<T>> | undefined {
        for (const icon of [
            update?.rowExpansion?.expandIcon,
            update?.rowExpansion?.collapseIcon,
        ]) {
            if (icon !== null && typeof icon === 'object') {
                this.externalValues.add(icon);
            }
        }

        const prev = this.store.getState();

        if (prev.dataMode !== 'server' || !update) {
            return update;
        }

        const changed =
            (update.filtering &&
                JSON.stringify(update.filtering) !==
                    JSON.stringify(prev.filtering)) ||
            (update.sorting &&
                JSON.stringify(update.sorting) !==
                    JSON.stringify(prev.sorting)) ||
            (update.pagination &&
                update.pagination.pageSize !== prev.pagination.pageSize);

        return changed
            ? {
                  ...update,
                  pagination: {
                      ...prev.pagination,
                      ...update.pagination,
                      page: 1,
                  },
              }
            : update;
    }

    /**
     * 建構暴露給插件和適配器的公開 API 物件。
     */
    private buildAPI(): TrellisAPI<T> {
        return {
            getState: () => this.store.getState() as TableState<T>,
            setState: (updater) =>
                this.store.setState(
                    (prev) =>
                        this.normalizeUpdate(updater(prev as TableState<T>)) ??
                        {},
                ),
            subscribe: (listener) =>
                this.store.subscribe(
                    listener as (state: TableState<T>) => void,
                ),
            on: (event: string, handler: EventHandler) =>
                this.eventBus.on(event, handler),
            emit: (event: string, payload?: unknown) =>
                this.eventBus.emit(event, payload),
            registerSlot: (name: string, renderer: SlotRenderer) =>
                this.slotRegistry.register(name, renderer),
            getSlot: (name: string) => this.slotRegistry.get(name),
            registerTransform: (name, priority, fn, options) => {
                this.transforms.push({
                    name,
                    priority,
                    fn,
                    stateKeys: options ? [...options.stateKeys] : undefined,
                });
            },
            recompute: (withState) => {
                this.runPipeline(withState);
            },
            recomputeView: () => this.runPipeline(undefined, true),
            updateSourceData: (data, withState) => {
                this.sourceData = this.processData(data);
                this.runPipeline(withState);
            },
            addRow: (item) => {
                this.externalValues.add(item);
                const index = this.sourceData.length;
                const reserved = new Set(
                    this.sourceData.map((row) => String(row.id)),
                );
                const explicitId = this.resolveRowId(item, index);

                if (explicitId !== undefined) {
                    this.reserveRowId(explicitId, reserved);
                }

                const row: DataRow<T> = {
                    id: explicitId ?? this.allocateRowId(reserved),
                    original: item,
                    index,
                };
                this.sourceData = this.snapshotRows([...this.sourceData, row]);
                this.runPipeline();
                this.eventBus.emit('data:added', row.id);
            },
            removeRow: (id) => {
                const index = this.sourceData.findIndex((row) => row.id === id);

                if (index === -1) {
                    return;
                }

                this.sourceData = this.snapshotRows(
                    this.sourceData.filter((row) => row.id !== id),
                );
                this.runPipeline();
                this.eventBus.emit('data:removed', id);
            },
            updateRow: (id, partial) => {
                const index = this.sourceData.findIndex((row) => row.id === id);

                if (index === -1) {
                    return;
                }

                this.sourceData = this.snapshotRows(
                    this.sourceData.map((row) => {
                        if (row.id !== id) {
                            return row;
                        }

                        const original = { ...row.original, ...partial } as T;
                        this.externalValues.add(original);

                        return { ...row, original };
                    }),
                );
                this.runPipeline();
                this.eventBus.emit('data:updated', id);
            },
            getFilteredData: () => [...this.filteredData],
        };
    }

    private snapshotRows(rows: DataRow<T>[]): DataRow<T>[] {
        if (this.ownedRowArrays.has(rows)) {
            return rows;
        }

        const result = rows.map((row) => {
            if (this.ownedRows.has(row)) {
                return row;
            }

            const original = row.original;
            this.externalValues.add(original);
            const protectedRow = this.snapshot({
                ...row,
                id: row.id,
                index: row.index,
                original,
            });
            this.ownedRows.add(protectedRow);

            return protectedRow;
        });
        Object.freeze(result);
        this.ownedRowArrays.add(result);

        return result;
    }

    private applyTransform(
        entry: TransformEntry<T>,
        input: DataRow<T>[],
        state: TableState<T>,
        reuseCache: boolean,
    ): TransformResult<T> {
        const dependencies = entry.stateKeys?.map((key) => state[key]);
        const cached = this.transformCache.get(entry);

        if (
            reuseCache &&
            dependencies &&
            cached?.input === input &&
            dependencies.every((value, index) =>
                Object.is(value, cached.dependencies[index]),
            )
        ) {
            return cached.result;
        }

        const output = entry.fn([...input], this.snapshot(state));
        const result = Array.isArray(output)
            ? { data: this.snapshotRows(output) }
            : {
                  data: this.snapshotRows(output.data),
                  state: this.snapshot(output.state),
              };

        if (dependencies) {
            this.transformCache.set(entry, { input, dependencies, result });
        }

        return result;
    }

    /** 適配器和插件使用的公開 API。 */
    get api(): TrellisAPI<T> {
        return this._api;
    }

    /** 啟動插件資源；重複呼叫不會重複啟動。 */
    start(): void {
        if (!this.started && !this.destroyed) {
            this.started = true;
            this.pluginManager.startAll();
        }
    }

    /** 立即停止插件資源，保留狀態與訂閱供重新掛載使用。 */
    stop(): void {
        if (this.started && !this.destroyed) {
            this.started = false;
            this.pluginManager.stopAll();
        }
    }

    /** 銷毀實例 — 清除插件和事件監聽器。 */
    destroy(): void {
        this.stop();
        this.destroyed = true;
        this.pluginManager.destroyAll();
        this.transformCache = new WeakMap();
        this.eventBus.clear();
    }
}
