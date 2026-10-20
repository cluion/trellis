// Trellis Core — headless data table engine

// Main class
export { Trellis } from './trellis';

// Subsystems (advanced use)
export { EventBus } from './event/event-bus';
export { StateStore } from './state/store';
export { SlotRegistry } from './slot/slot-registry';
export { PluginManager } from './plugin/plugin-manager';

// Types
export type {
    CellContext,
    ColumnDef,
    ColumnSortFn,
    HeaderContext,
} from './types/column';
export type { DataRow, DataId } from './types/data';
export type {
    SortCriterion,
    SortState,
    FilterState,
    PaginationState,
    TableState,
} from './types/state';
export type { VirtualScrollState } from './types/virtual-scroll';
export type { ColumnPinningState, PinOffset } from './types/column-pinning';
export { calculatePinOffsets } from './types/column-pinning';
export { getBodyCellLayout, getHeaderCellLayout } from './layout/cell-layout';
export { getCellValue } from './layout/cell-value';
export type {
    CellLayout,
    CellStyle,
    HeaderCellLayout,
} from './layout/cell-layout';
export type { ColumnResizingState } from './types/column-resizing';
export type {
    EventHandler,
    EventPayloadArgs,
    TrellisEventMap,
    UnknownEvent,
} from './types/event';
export type { SlotRenderer, SlotContext } from './types/slot';
export type { TrellisAPI, TrellisPlugin, TrellisOptions } from './types/plugin';
