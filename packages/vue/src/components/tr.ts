import type { ColumnDef, DataRow } from '@trellisjs/core';
import { defineComponent, h } from 'vue';
import type { PropType, VNodeChild } from 'vue';
import { useTrellisState } from '../context';
import { TlExpansionToggle } from './expansion-toggle';
import { TlTd } from './td';

/** 資料列：渲染可見欄位，啟用展開時在最前面加上切換按鈕。 */
export const TlTr = defineComponent({
    name: 'TlTr',
    props: {
        row: { type: Object as PropType<DataRow>, required: true },
        columns: { type: Array as PropType<ColumnDef[]>, required: true },
        hasExpansion: { type: Boolean, default: false },
    },
    setup(props) {
        const state = useTrellisState();

        return () => {
            const expansion = state.value.rowExpansion;

            return h('tr', null, [
                props.hasExpansion
                    ? h('td', { class: 'trellis-expansion-td' }, [
                          h(TlExpansionToggle, {
                              rowId: props.row.id,
                              expandIcon: expansion?.expandIcon as VNodeChild,
                              collapseIcon:
                                  expansion?.collapseIcon as VNodeChild,
                          }),
                      ])
                    : null,
                ...props.columns
                    .filter((col) => col.visible !== false)
                    .map((col) =>
                        h(TlTd, { key: col.id, row: props.row, column: col }),
                    ),
            ]);
        };
    },
});
