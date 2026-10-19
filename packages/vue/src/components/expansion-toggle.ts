import type { DataId } from '@trellisjs/core';
import { defineComponent, h } from 'vue';
import type { PropType, VNodeChild } from 'vue';
import { useTrellisContext, useTrellisState } from '../context';

const DEFAULT_EXPAND_ICON = '▶'; // ▶
const DEFAULT_COLLAPSE_ICON = '▼'; // ▼

/** 展開／收合切換按鈕，點擊時發出 expansion:toggle。 */
export const TlExpansionToggle = defineComponent({
    name: 'TlExpansionToggle',
    props: {
        rowId: {
            type: [String, Number] as PropType<DataId>,
            required: true,
        },
        expandIcon: {
            type: null as unknown as PropType<VNodeChild>,
            default: undefined,
        },
        collapseIcon: {
            type: null as unknown as PropType<VNodeChild>,
            default: undefined,
        },
    },
    setup(props) {
        const api = useTrellisContext();
        const state = useTrellisState();

        return () => {
            const isExpanded = state.value.expandedRows.has(props.rowId);
            const icon = isExpanded
                ? (props.collapseIcon ?? DEFAULT_COLLAPSE_ICON)
                : (props.expandIcon ?? DEFAULT_EXPAND_ICON);

            return h(
                'button',
                {
                    type: 'button',
                    class: 'trellis-expansion-toggle',
                    'aria-expanded': isExpanded,
                    'aria-label': isExpanded ? '收合' : '展開',
                    onClick: () =>
                        api.emit('expansion:toggle', { rowId: props.rowId }),
                },
                [icon],
            );
        };
    },
});
