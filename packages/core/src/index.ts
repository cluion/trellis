// Trellis Core — 無頭式資料表格引擎

// 主類別
export { Trellis } from './trellis';

// 子系統（供進階使用）
export { EventBus } from './event/event-bus';
export { StateStore } from './state/store';
export { SlotRegistry } from './slot/slot-registry';
export { PluginManager } from './plugin/plugin-manager';

// 型別
export type { ColumnDef, ColumnSortFn } from './types/column';
export type { DataRow, DataId } from './types/data';
export type {
  SortState,
  FilterState,
  PaginationState,
  TableState,
} from './types/state';
export type { EventHandler } from './types/event';
export type { SlotRenderer, SlotContext } from './types/slot';
export type {
  TrellisAPI,
  TrellisPlugin,
  TrellisOptions,
} from './types/plugin';
