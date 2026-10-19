import type { ColumnDef } from '@trellisjs/core';
import { getHeaderCellLayout } from '@trellisjs/core';
import { defineComponent, h } from 'vue';
import type { PropType } from 'vue';
import { useTrellisState } from '../context';
import { TlResizeHandle } from './resize-handle';

/** 表頭儲存格：處理欄寬、對齊、固定表頭、欄釘選與調整欄寬把手。 */
export const TlTh = defineComponent({
    name: 'TlTh',
    props: {
        column: { type: Object as PropType<ColumnDef>, required: true },
        stickyHeader: { type: Boolean, default: false },
    },
    setup(props) {
        const state = useTrellisState();

        return () => {
            const { style, className, resizable } = getHeaderCellLayout(
                props.column,
                state.value,
                props.stickyHeader,
            );

            return h('th', { style, class: className }, [
                props.column.header,
                resizable
                    ? h(TlResizeHandle, { columnId: props.column.id })
                    : null,
            ]);
        };
    },
});
