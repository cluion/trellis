import type { ColumnDef } from '@trellisjs/core';
import { getHeaderCellLayout } from '@trellisjs/core';
import { defineComponent, h } from 'vue';
import type { PropType, VNodeChild } from 'vue';
import { useTrellisContext, useTrellisState } from '../context';
import { TlResizeHandle } from './resize-handle';
import { useTableSlot } from './table-slots';

/**
 * Header cell: width, alignment, sticky header, column pinning and the resize handle.
 * Content comes from the `#header-{id}` / `#header` slot, then `column.renderHeader`,
 * then `column.header`.
 */
export const TlTh = defineComponent({
    name: 'TlTh',
    props: {
        column: { type: Object as PropType<ColumnDef>, required: true },
        stickyHeader: { type: Boolean, default: false },
    },
    setup(props) {
        const api = useTrellisContext();
        const state = useTrellisState();
        const renderSlot = useTableSlot();

        return () => {
            const { column } = props;
            const { style, className, resizable } = getHeaderCellLayout(
                column,
                state.value,
                props.stickyHeader,
            );
            const context = { column, api };
            const content = renderSlot('header', column.id, context, () =>
                column.renderHeader
                    ? (column.renderHeader(context) as VNodeChild)
                    : column.header,
            );

            return h('th', { style, class: className }, [
                content,
                resizable ? h(TlResizeHandle, { columnId: column.id }) : null,
            ]);
        };
    },
});
