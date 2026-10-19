import type { ColumnDef, DataRow } from '@trellisjs/core';
import { defineComponent, h } from 'vue';
import type { PropType } from 'vue';
import { useTrellisState } from '../context';
import { TlExpansionRow } from './expansion-row';
import { TlTr } from './tr';

/** 表格內容：渲染每一列，已展開的列下方接著渲染展開內容。 */
export const TlTableBody = defineComponent({
    name: 'TlTableBody',
    props: {
        data: { type: Array as PropType<DataRow[]>, required: true },
        columns: { type: Array as PropType<ColumnDef[]>, required: true },
    },
    setup(props) {
        const state = useTrellisState();

        return () => {
            const { rowExpansion, expandedRows } = state.value;
            const hasExpansion = !!rowExpansion;
            const visibleCount = props.columns.filter(
                (col) => col.visible !== false,
            ).length;
            const colSpan = hasExpansion ? visibleCount + 1 : visibleCount;

            return h(
                'tbody',
                null,
                props.data.flatMap((row) => [
                    h(TlTr, {
                        key: row.id,
                        row,
                        columns: props.columns,
                        hasExpansion,
                    }),
                    expandedRows.has(row.id)
                        ? h(TlExpansionRow, {
                              key: `${row.id}:expansion`,
                              row,
                              colSpan,
                          })
                        : null,
                ]),
            );
        };
    },
});
