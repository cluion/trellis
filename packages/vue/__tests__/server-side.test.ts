import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createDatasourcePlugin } from '../../plugin-datasource/src';
import type {
    TrellisDatasource,
    TrellisResponse,
} from '../../plugin-datasource/src';
import { mountWithTrellis } from './helpers';

describe('Vue server-side 綁定', () => {
    it('響應 loading、資料列、總數與錯誤重試', async () => {
        const fetch = vi
            .fn<TrellisDatasource<{ name: string }>['fetch']>()
            .mockRejectedValueOnce(new Error('Offline'))
            .mockResolvedValue({
                data: [{ name: 'Alice' }],
                total: 100,
                filtered: 1,
            });
        const { wrapper, trellis } = mountWithTrellis(
            {
                data: [],
                columns: [{ id: 'name', accessor: 'name', header: 'Name' }],
                plugins: [createDatasourcePlugin({ datasource: { fetch } })],
            },
            ({ state }) =>
                h(
                    'div',
                    state.value.datasource?.loading
                        ? 'Loading'
                        : (state.value.datasource?.error?.message ??
                              state.value.data
                                  .map((row) => row.original.name)
                                  .join(',')),
                ),
        );
        await flushPromises();
        expect(wrapper.text()).toBe('Offline');
        trellis.api.emit('datasource:retry');
        await flushPromises();
        expect(wrapper.text()).toBe('Alice');
        expect(trellis.state.value.pagination.totalItems).toBe(1);
        expect(trellis.state.value.datasource?.total).toBe(100);
        wrapper.unmount();
    });

    it('卸載取消請求並阻止晚到回應更新', async () => {
        let resolve!: (response: TrellisResponse<{ name: string }>) => void;
        const fetch = vi
            .fn<TrellisDatasource<{ name: string }>['fetch']>()
            .mockImplementation(
                () =>
                    new Promise((done) => {
                        resolve = done;
                    }),
            );
        const { wrapper, trellis } = mountWithTrellis(
            {
                data: [],
                columns: [],
                plugins: [createDatasourcePlugin({ datasource: { fetch } })],
            },
            () => null,
        );
        await flushPromises();
        expect(trellis.state.value.datasource?.loading).toBe(true);
        wrapper.unmount();
        expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
        const before = trellis.api.getState();
        resolve({ data: [{ name: 'Late' }], total: 1, filtered: 1 });
        await flushPromises();
        expect(trellis.api.getState()).toBe(before);
    });
});
