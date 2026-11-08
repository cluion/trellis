import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UserTable from '../../../examples/vue-server-side/UserTable.vue';
import { createStaticDatasource } from '../../plugin-datasource/src';

afterEach(() => vi.unstubAllGlobals());

describe('Vue server-side 範例實際操作', () => {
    it('透過 HTTP 編碼查詢完成跨頁、搜尋、排序、錯誤重試與零筆流程', async () => {
        const users = Array.from({ length: 24 }, (_, i) => ({
            id: i + 1,
            name: `User ${String(i + 1).padStart(3, '0')}`,
            email: `${i + 1}@example.test`,
        }));
        const backend = createStaticDatasource(users);
        const fetch = vi.fn(async (url: string) => {
            const params = new URL(url, 'https://example.test').searchParams;
            expect(params.get('scope')).toBe('active');
            const result = await backend.fetch({
                page: Number(params.get('page')),
                pageSize: Number(params.get('pageSize')),
                sort: JSON.parse(params.get('sort') ?? '[]'),
                filter: JSON.parse(params.get('filter') ?? '{}'),
            });

            return { ok: true, json: async () => result };
        });
        vi.stubGlobal('fetch', fetch);
        const wrapper = mount(UserTable);
        const button = (text: string) =>
            wrapper.findAll('button').find((item) => item.text() === text)!;
        await flushPromises();
        expect(wrapper.findAll('tbody tr')).toHaveLength(10);
        expect(wrapper.find('tbody tr').text()).toContain('User 001');
        await button('下一頁').trigger('click');
        await flushPromises();
        expect(wrapper.find('tbody tr').text()).toContain('User 011');
        await wrapper.find('input[type=search]').setValue('User 02');
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
        await flushPromises();
        expect(wrapper.findAll('tbody tr')).toHaveLength(5);
        expect(wrapper.text()).toContain('篩選後 5 筆／全部 24 筆');
        expect(wrapper.text()).toContain('第 1／1 頁');
        await button('姓名降冪').trigger('click');
        await flushPromises();
        expect(wrapper.find('tbody tr').text()).toContain('User 024');
        fetch.mockRejectedValueOnce(new Error('internal transport details'));
        await button('重新載入').trigger('click');
        await flushPromises();
        expect(wrapper.find('[role=alert]').text()).toContain('資料載入失敗');
        expect(wrapper.text()).not.toContain('internal transport details');
        await button('重試').trigger('click');
        await flushPromises();
        expect(wrapper.find('[role=alert]').exists()).toBe(false);
        await wrapper.find('select').setValue('25');
        await flushPromises();
        const lastUrl = new URL(
            fetch.mock.lastCall![0],
            'https://example.test',
        );
        expect(lastUrl.searchParams.get('pageSize')).toBe('25');
        await wrapper.find('input[type=search]').setValue('no results');
        await vi.waitFor(() => expect(wrapper.text()).toContain('查無資料'));
        expect(wrapper.findAll('tbody tr')).toHaveLength(0);
        expect(wrapper.text()).toContain('篩選後 0 筆／全部 24 筆');
        expect(button('下一頁').attributes('disabled')).toBeDefined();
        wrapper.unmount();
    });
});
