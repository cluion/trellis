import type { DataRow } from '@trellisjs/core';
import { defineComponent, h } from 'vue';
import type { PropType } from 'vue';
import { TlSlotRenderer } from './slot-renderer';

/** 展開後的內容列，渲染 expansion:default 插槽。 */
export const TlExpansionRow = defineComponent({
    name: 'TlExpansionRow',
    props: {
        row: { type: Object as PropType<DataRow>, required: true },
        colSpan: { type: Number, required: true },
    },
    setup(props) {
        return () =>
            h(
                'tr',
                {
                    class: 'trellis-expansion-row trellis-expansion--expanded',
                    onClick: (event: MouseEvent) => event.stopPropagation(),
                },
                [
                    h(
                        'td',
                        {
                            colspan: props.colSpan,
                            class: 'trellis-expansion-cell',
                        },
                        [
                            h(TlSlotRenderer, {
                                name: 'expansion:default',
                                context: {
                                    row: props.row.original,
                                    rowId: props.row.id,
                                },
                            }),
                        ],
                    ),
                ],
            );
    },
});
