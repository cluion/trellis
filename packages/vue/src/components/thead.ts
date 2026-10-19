import type { ColumnDef } from '@trellisjs/core';
import { defineComponent, h } from 'vue';
import type { PropType } from 'vue';
import { useTrellisState } from '../context';
import { TlTh } from './th';

/** 表頭：渲染可見欄位，啟用展開時在最前面保留一欄。 */
export const TlTableHead = defineComponent({
    name: 'TlTableHead',
    props: {
        columns: { type: Array as PropType<ColumnDef[]>, required: true },
        stickyHeader: { type: Boolean, default: false },
    },
    setup(props) {
        const state = useTrellisState();

        return () =>
            h(
                'thead',
                {
                    class: props.stickyHeader
                        ? 'trellis-thead--sticky'
                        : undefined,
                },
                [
                    h('tr', null, [
                        state.value.rowExpansion
                            ? h('th', { class: 'trellis-expansion-th' })
                            : null,
                        ...props.columns
                            .filter((col) => col.visible !== false)
                            .map((col) =>
                                h(TlTh, {
                                    key: col.id,
                                    column: col,
                                    stickyHeader: props.stickyHeader,
                                }),
                            ),
                    ]),
                ],
            );
    },
});
