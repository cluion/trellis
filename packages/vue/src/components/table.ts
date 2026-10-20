import { defineComponent, h, provide } from 'vue';
import type { SlotsType } from 'vue';
import { useTrellisState } from '../context';
import { TlTableSlotsKey } from './table-slots';
import type { TlTableSlots } from './table-slots';
import { TlTableBody } from './tbody';
import { TlTableHead } from './thead';
import { TlVirtualScrollBody } from './virtual-scroll-body';

/**
 * Full table: header plus a regular or virtual-scroll body.
 * Scoped slots `#cell-{columnId}`, `#cell`, `#header-{columnId}` and `#header`
 * customize cell and header content.
 */
export const TlTable = defineComponent({
    name: 'TlTable',
    props: {
        /** Keep the header visible while scrolling */
        stickyHeader: { type: Boolean, default: false },
        /** Render the body with virtual scrolling (requires the virtual-scroll plugin) */
        virtualScroll: { type: Boolean, default: false },
    },
    slots: Object as SlotsType<TlTableSlots>,
    setup(props, { slots }) {
        const state = useTrellisState();

        provide(TlTableSlotsKey, slots);

        return () => {
            const { columns, data, columnPinning } = state.value;
            const hasPinnedColumns =
                columnPinning.left.length > 0 || columnPinning.right.length > 0;
            const wrapperStyle: Record<string, string> = {};

            if (props.virtualScroll) {
                wrapperStyle.overflowY = 'auto';
            }

            if (hasPinnedColumns) {
                wrapperStyle.overflowX = 'auto';
            }

            return h(
                'div',
                {
                    style:
                        Object.keys(wrapperStyle).length > 0
                            ? wrapperStyle
                            : undefined,
                },
                [
                    h('table', null, [
                        h(TlTableHead, {
                            columns,
                            stickyHeader: props.stickyHeader,
                        }),
                        props.virtualScroll
                            ? h(TlVirtualScrollBody)
                            : h(TlTableBody, { data, columns }),
                    ]),
                ],
            );
        };
    },
});
