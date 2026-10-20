// Trellis Vue 3 adapter

// provide / inject
export {
    TrellisKey,
    createTrellisState,
    provideTrellis,
    useTrellisContext,
    useTrellisState,
} from './context';
export type { TrellisContextValue, TrellisStateRef } from './context';

// Composables
export { useTrellis } from './composables/use-trellis';
export type {
    UseTrellisOptions,
    UseTrellisReturn,
} from './composables/use-trellis';
export { useVirtualScroll } from './composables/use-virtual-scroll';
export type { UseVirtualScrollReturn } from './composables/use-virtual-scroll';

// Components
export {
    TlTable,
    TlTableHead,
    TlTableBody,
    TlVirtualScrollBody,
    TlTr,
    TlTh,
    TlTd,
    TlTableInfo,
    TlExpansionToggle,
    TlExpansionRow,
    TlResizeHandle,
    TlSlotRenderer,
} from './components';
export type { TableInfoFormat, TlTableSlots } from './components';
