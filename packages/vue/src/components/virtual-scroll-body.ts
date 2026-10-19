import { defineComponent, h } from 'vue';
import { useTrellisState } from '../context';
import { TlTr } from './tr';

function spacer(position: 'top' | 'bottom', height: number, colSpan: number) {
    return h(
        'tr',
        {
            class: `trellis-virtual-scroll__spacer trellis-virtual-scroll__spacer--${position}`,
        },
        [
            h('td', {
                colspan: colSpan,
                style: { height: `${height}px`, padding: '0px' },
            }),
        ],
    );
}

/**
 * 虛擬滾動版的表格內容：只渲染 startIndex 到 endIndex 的列，
 * 上下用空白列撐出捲動高度。沒有 virtualScroll 狀態時渲染全部列。
 */
export const TlVirtualScrollBody = defineComponent({
    name: 'TlVirtualScrollBody',
    setup() {
        const state = useTrellisState();

        return () => {
            const { data, columns, virtualScroll: vs } = state.value;

            if (!vs) {
                return h(
                    'tbody',
                    null,
                    data.map((row) => h(TlTr, { key: row.id, row, columns })),
                );
            }

            const { startIndex, endIndex, rowHeight, totalHeight } = vs;
            const topHeight = startIndex * rowHeight;
            const bottomHeight = Math.max(
                0,
                totalHeight - endIndex * rowHeight,
            );
            const colSpan = columns.filter(
                (col) => col.visible !== false,
            ).length;

            return h('tbody', null, [
                topHeight > 0 ? spacer('top', topHeight, colSpan) : null,
                ...data.map((row) =>
                    h(TlTr, {
                        key: row.id,
                        row,
                        columns,
                        class: 'trellis-virtual-scroll__data-row',
                    }),
                ),
                bottomHeight > 0
                    ? spacer('bottom', bottomHeight, colSpan)
                    : null,
            ]);
        };
    },
});
