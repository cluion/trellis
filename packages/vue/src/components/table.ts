import { defineComponent, h } from 'vue';
import { useTrellisState } from '../context';
import { TlTableBody } from './tbody';
import { TlTableHead } from './thead';
import { TlVirtualScrollBody } from './virtual-scroll-body';

/** 完整表格：表頭加上一般或虛擬滾動的內容。 */
export const TlTable = defineComponent({
    name: 'TlTable',
    props: {
        /** 捲動時固定表頭 */
        stickyHeader: { type: Boolean, default: false },
        /** 使用虛擬滾動渲染內容（需安裝 virtual-scroll 插件） */
        virtualScroll: { type: Boolean, default: false },
    },
    setup(props) {
        const state = useTrellisState();

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
