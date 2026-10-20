import type { ColumnDef, DataRow } from '@trellisjs/core';
import { getBodyCellLayout, getCellValue } from '@trellisjs/core';
import { defineComponent, h } from 'vue';
import type { PropType, VNodeChild } from 'vue';
import { useTrellisContext, useTrellisState } from '../context';
import { useTableSlot } from './table-slots';

/**
 * Data cell: alignment and column pinning.
 * Content comes from the `#cell-{id}` / `#cell` slot, then `column.renderCell`,
 * then the value as a string.
 */
export const TlTd = defineComponent({
    name: 'TlTd',
    props: {
        row: { type: Object as PropType<DataRow>, required: true },
        column: { type: Object as PropType<ColumnDef>, required: true },
    },
    setup(props) {
        const api = useTrellisContext();
        const state = useTrellisState();
        const renderSlot = useTableSlot();

        return () => {
            const { row, column } = props;
            const value = getCellValue(row, column);
            const { style, className } = getBodyCellLayout(column, state.value);
            const context = { row, value, column, api };
            const content = renderSlot('cell', column.id, context, () =>
                column.renderCell
                    ? (column.renderCell(context) as VNodeChild)
                    : value != null
                      ? String(value)
                      : '',
            );

            return h('td', { style, class: className }, [content]);
        };
    },
});
