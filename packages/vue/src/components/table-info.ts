import type { PaginationState } from '@trellisjs/core';
import { defineComponent, inject } from 'vue';
import type { PropType, VNodeChild } from 'vue';
import { TrellisKey } from '../context';

export type TableInfoFormat =
    | string
    | ((info: { start: number; end: number; total: number }) => VNodeChild);

const DEFAULT_FORMAT = 'Showing {start} to {end} of {total} entries';

/**
 * 表格資訊列：顯示目前分頁的資料範圍（第 X 到 Y 筆，共 Z 筆）。
 * 有傳 pagination 時不需要 useTrellis() 或 provideTrellis()。
 */
export const TlTableInfo = defineComponent({
    name: 'TlTableInfo',
    props: {
        /** 格式化字串模板或 render 函式 */
        format: {
            type: [String, Function] as PropType<TableInfoFormat>,
            default: DEFAULT_FORMAT,
        },
        /** 外部傳入的分頁資料；未提供時從 Trellis 狀態讀取 */
        pagination: {
            type: Object as PropType<
                Pick<PaginationState, 'page' | 'pageSize' | 'totalItems'>
            >,
            default: undefined,
        },
    },
    setup(props) {
        const context = inject(TrellisKey, null);

        return () => {
            const pg = props.pagination ?? context?.state.value.pagination;

            if (!pg) {
                throw new Error(
                    'TlTableInfo needs a pagination prop or an ancestor that called useTrellis() or provideTrellis()',
                );
            }

            const { page, pageSize, totalItems: total } = pg;
            const start = total > 0 ? (page - 1) * pageSize + 1 : 0;
            const end = total > 0 ? Math.min(page * pageSize, total) : 0;

            if (typeof props.format === 'function') {
                return props.format({ start, end, total });
            }

            return props.format
                .replace('{start}', String(start))
                .replace('{end}', String(end))
                .replace('{total}', String(total));
        };
    },
});
