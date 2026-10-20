import type { CellContext, HeaderContext } from '@trellisjs/core';
import { inject } from 'vue';
import type { InjectionKey, Slot, Slots, VNodeChild } from 'vue';

/**
 * Scoped slots accepted by `TlTable`:
 * `#cell-{columnId}` / `#cell` receive a `CellContext`,
 * `#header-{columnId}` / `#header` receive a `HeaderContext`.
 */
export type TlTableSlots = {
    cell?: Slot<CellContext<any>>;
    header?: Slot<HeaderContext<any>>;
} & {
    [name: `cell-${string}`]: Slot<CellContext<any>> | undefined;
} & {
    [name: `header-${string}`]: Slot<HeaderContext<any>> | undefined;
};

/** Lets `TlTh` and `TlTd` read the scoped slots passed to their `TlTable`. */
export const TlTableSlotsKey: InjectionKey<Slots> = Symbol(
    'trellis-table-slots',
);

/**
 * Renders the `{kind}-{columnId}` slot, then the generic `{kind}` slot, then `fallback`.
 * Works without a `TlTable` ancestor (no slots are injected then).
 */
export function useTableSlot() {
    const slots = inject(TlTableSlotsKey, null);

    return <P>(
        kind: 'cell' | 'header',
        columnId: string,
        props: P,
        fallback: () => VNodeChild,
    ): VNodeChild => {
        const slot = slots?.[`${kind}-${columnId}`] ?? slots?.[kind];

        return slot ? slot(props) : fallback();
    };
}
