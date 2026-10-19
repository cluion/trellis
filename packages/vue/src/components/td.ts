import type { ColumnDef, DataRow } from '@trellisjs/core';
import { getBodyCellLayout, getCellValue } from '@trellisjs/core';
import { defineComponent, h } from 'vue';
import type { PropType } from 'vue';
import { useTrellisState } from '../context';

/** 資料儲存格：依 accessor 顯示值，並處理對齊與欄釘選。 */
export const TlTd = defineComponent({
    name: 'TlTd',
    props: {
        row: { type: Object as PropType<DataRow>, required: true },
        column: { type: Object as PropType<ColumnDef>, required: true },
    },
    setup(props) {
        const state = useTrellisState();

        return () => {
            const value = getCellValue(props.row, props.column);
            const { style, className } = getBodyCellLayout(
                props.column,
                state.value,
            );

            return h(
                'td',
                { style, class: className },
                value != null ? String(value) : '',
            );
        };
    },
});
