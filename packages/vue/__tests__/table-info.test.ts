import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { TlTableInfo } from '../src';
import { mountWithTrellis } from './helpers';

const data = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
const columns = [{ id: 'id', accessor: 'id' as const, header: 'ID' }];

function mountInfo(props: Record<string, unknown> = {}, page = 1, rows = data) {
    return mountWithTrellis(
        {
            data: rows,
            columns,
            pageSize: 10,
            plugins: [createPaginationPlugin()],
        },
        ({ api }) => {
            if (api.getState().pagination.page !== page) {
                api.emit('pagination:goto', { page });
            }

            return h('div', [h(TlTableInfo, props)]);
        },
    ).wrapper;
}

describe('TlTableInfo', () => {
    it('預設格式，第一頁', () => {
        expect(mountInfo().text()).toBe('Showing 1 to 10 of 25 entries');
    });

    it('最後一頁', () => {
        expect(mountInfo({}, 3).text()).toBe('Showing 21 to 25 of 25 entries');
    });

    it('沒有資料時都是 0', () => {
        expect(mountInfo({}, 1, []).text()).toBe('Showing 0 to 0 of 0 entries');
    });

    it('支援字串模板', () => {
        expect(
            mountInfo({
                format: '第 {start} 到 {end} 筆，共 {total} 筆',
            }).text(),
        ).toBe('第 1 到 10 筆，共 25 筆');
    });

    it('支援 render 函式', () => {
        const wrapper = mountInfo({
            format: ({ start, end, total }: Record<string, number>) =>
                h('strong', `${start}-${end}/${total}`),
        });

        expect(wrapper.find('strong').text()).toBe('1-10/25');
    });

    it('有傳 pagination 時不需要 provider', () => {
        const wrapper = mount(TlTableInfo, {
            props: { pagination: { page: 2, pageSize: 10, totalItems: 25 } },
        });

        expect(wrapper.text()).toBe('Showing 11 to 20 of 25 entries');
    });

    it('沒有 provider 也沒有 pagination 時丟出錯誤', () => {
        expect(() => mount(TlTableInfo)).toThrow(
            'TlTableInfo needs a pagination prop or an ancestor that called useTrellis() or provideTrellis()',
        );
    });
});
