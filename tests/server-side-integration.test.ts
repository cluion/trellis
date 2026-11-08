import { afterEach, describe, expect, it, vi } from 'vitest';
import { Trellis } from '../packages/core/src';
import type { ColumnDef } from '../packages/core/src';
import {
    createDatasourcePlugin,
    createStaticDatasource,
} from '../packages/plugin-datasource/src';
import type {
    TrellisDatasource,
    TrellisQuery,
    TrellisResponse,
} from '../packages/plugin-datasource/src';
import { createFilterPlugin } from '../packages/plugin-filter/src';
import { createPaginationPlugin } from '../packages/plugin-pagination/src';
import { createSortPlugin } from '../packages/plugin-sort/src';

interface User {
    id: number;
    name: string;
    city: string;
}
const users: User[] = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    city: i % 2 ? 'Tokyo' : 'Taipei',
}));
const columns: ColumnDef<User>[] = [
    { id: 'id', accessor: 'id', header: 'ID' },
    { id: 'name', accessor: 'name', header: 'Name' },
    { id: 'city', accessor: 'city', header: 'City' },
];
const tables: Trellis<User>[] = [];
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

function setup(
    datasource: TrellisDatasource<User> = createStaticDatasource(users),
    initialQuery?: Partial<TrellisQuery>,
    datasourceFirst = false,
) {
    const remote = createDatasourcePlugin({ datasource, initialQuery });
    const plugins = [
        createFilterPlugin(),
        createSortPlugin(),
        createPaginationPlugin(),
    ];
    const table = new Trellis<User>({
        data: [],
        columns,
        rowId: 'id',
        pageSize: 2,
        plugins: datasourceFirst ? [remote, ...plugins] : [...plugins, remote],
    });
    tables.push(table);

    return table.api;
}

afterEach(() => tables.splice(0).forEach((table) => table.destroy()));

describe('server-side 查詢與分頁', () => {
    it.each([false, true])(
        '首次依初始查詢載入，且不依賴插件順序：datasourceFirst=%s',
        async (first) => {
            const fetch = vi.fn(createStaticDatasource(users).fetch);
            const api = setup(
                { fetch },
                {
                    page: 2,
                    sort: [{ columnId: 'id', direction: 'desc' }],
                    filter: { global: 'Taipei' },
                },
                first,
            );
            await tick();
            expect(fetch).toHaveBeenCalledOnce();
            expect(api.getState().data.map((row) => row.original.id)).toEqual([
                7, 5,
            ]);
            expect(api.getState().pagination).toEqual({
                page: 2,
                pageSize: 2,
                totalItems: 6,
            });
            expect(api.getState().datasource).toEqual({
                loading: false,
                error: null,
                total: 12,
                filtered: 6,
            });
        },
    );

    it('保留後端資料順序與總數，不對當頁再次搜尋、排序或切頁', async () => {
        const data = [users[11], users[0]];
        const api = setup(
            { fetch: async () => ({ data, total: 100, filtered: 20 }) },
            {
                page: 3,
                filter: { global: 'unmatched' },
                sort: [{ columnId: 'id', direction: 'asc' }],
            },
        );
        await tick();
        expect(api.getState().data.map((row) => row.original)).toEqual(data);
        api.recompute();
        expect(api.getState().pagination.totalItems).toBe(20);
        expect(api.getState().datasource?.total).toBe(100);
        expect(api.getFilteredData().map((row) => row.original)).toEqual(data);
    });

    it('跨頁搜尋、欄位篩選、排序與每頁筆數改變會回到第一頁', async () => {
        const fetch = vi.fn(createStaticDatasource(users).fetch);
        const api = setup({ fetch });
        await tick();
        api.emit('pagination:goto', { page: 4 });
        await tick();
        expect(api.getState().data[0].original.id).toBe(7);
        api.emit('filter:change', { query: 'Taipei' });
        await tick();
        expect(api.getState().pagination.page).toBe(1);
        expect(api.getState().data.map((row) => row.original.id)).toEqual([
            1, 3,
        ]);
        api.emit('pagination:goto', { page: 2 });
        await tick();
        api.emit('sort:change', { columnId: 'id', direction: 'desc' });
        await tick();
        expect(api.getState().pagination.page).toBe(1);
        expect(api.getState().data.map((row) => row.original.id)).toEqual([
            11, 9,
        ]);
        api.emit('pagination:next');
        await tick();
        api.emit('filter:column', { columnId: 'name', value: '1' });
        await tick();
        expect(api.getState().pagination.page).toBe(1);
        expect(api.getState().pagination.totalItems).toBe(2);
        api.emit('filter:column', { columnId: 'name', value: '' });
        await tick();
        api.emit('pagination:goto', { page: 2 });
        await tick();
        expect(api.getState().pagination.page).toBe(2);
        api.emit('pagination:pageSize', { pageSize: 1 });
        await tick();
        expect(fetch.mock.lastCall?.[0]).toMatchObject({
            page: 1,
            pageSize: 1,
        });
        expect(api.getState().data[0].original.id).toBe(11);
    });

    it('直接更新查詢狀態也會請求；非查詢變更不會重複請求', async () => {
        const fetch = vi.fn(createStaticDatasource(users).fetch);
        const api = setup({ fetch }, { page: 3 });
        await tick();
        api.setState(() => ({ selection: new Set(['1']) }));
        api.recompute();
        await tick();
        expect(fetch).toHaveBeenCalledTimes(1);
        api.setState(() => ({
            filtering: { query: 'Tokyo', columnFilters: {} },
        }));
        expect(api.getState().pagination.page).toBe(1);
        await tick();
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(api.getState().pagination.totalItems).toBe(6);
    });

    it('零筆保留 total，校正至第一頁', async () => {
        const fetch = vi.fn(async () => ({ data: [], total: 12, filtered: 0 }));
        const api = setup({ fetch }, { page: 8 });
        await tick();
        expect(api.getState().pagination).toEqual({
            page: 1,
            pageSize: 2,
            totalItems: 0,
        });
        expect(api.getState().datasource).toEqual({
            loading: false,
            error: null,
            total: 12,
            filtered: 0,
        });
        expect(api.getState().data).toEqual([]);
        api.emit('pagination:next');
        await tick();
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('資料減少造成越界時，校正並重新取得最後一頁', async () => {
        const fetch = vi.fn(createStaticDatasource(users.slice(0, 3)).fetch);
        const api = setup({ fetch }, { page: 9 });
        await tick();
        expect(fetch.mock.calls.map(([query]) => query.page)).toEqual([9, 2]);
        expect(api.getState().pagination).toEqual({
            page: 2,
            pageSize: 2,
            totalItems: 3,
        });
        expect(api.getState().data.map((row) => row.original.id)).toEqual([3]);
        expect(api.getState().datasource?.loading).toBe(false);
    });

    it('無效初始頁碼會明確拒絕', () => {
        expect(() => setup(undefined, { page: 0 })).toThrow(
            /positive safe integers/,
        );
    });
});

describe('server-side 請求生命週期', () => {
    it('stop 立即取消進行中的請求，start 可重新載入且不接受停止前的回應', async () => {
        const old = deferred<TrellisResponse<User>>();
        const fetch = vi
            .fn<TrellisDatasource<User>['fetch']>()
            .mockReturnValueOnce(old.promise)
            .mockResolvedValue({ data: [users[1]], total: 1, filtered: 1 });
        const api = setup({ fetch });
        const table = tables.at(-1)!;
        await tick();
        table.stop();
        expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
        api.emit('filter:change', { query: 'updated while stopped' });
        await tick();
        expect(fetch).toHaveBeenCalledOnce();
        table.start();
        await tick();
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch.mock.lastCall?.[0].filter?.global).toBe(
            'updated while stopped',
        );
        expect(api.getState().data[0].original.id).toBe(2);
        old.resolve({ data: [users[0]], total: 1, filtered: 1 });
        await tick();
        expect(api.getState().data[0].original.id).toBe(2);
    });

    it('首次請求送出前銷毀時，不呼叫 datasource', async () => {
        const fetch = vi.fn(createStaticDatasource(users).fetch);
        setup({ fetch });
        tables.at(-1)!.destroy();
        await tick();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('快速連續查詢取消舊請求，即使 datasource 忽略 signal 也不套用舊回應', async () => {
        const first = deferred<TrellisResponse<User>>();
        const second = deferred<TrellisResponse<User>>();
        const third = deferred<TrellisResponse<User>>();
        const fetch = vi
            .fn<TrellisDatasource<User>['fetch']>()
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise)
            .mockReturnValueOnce(third.promise);
        const api = setup({ fetch });
        await tick();
        expect(api.getState().datasource?.loading).toBe(true);
        api.emit('filter:change', { query: 'second' });
        expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
        await tick();
        api.emit('filter:change', { query: 'third' });
        await tick();
        second.reject(new Error('stale failure'));
        first.resolve({ data: [users[0]], total: 1, filtered: 1 });
        await tick();
        expect(api.getState().datasource?.loading).toBe(true);
        expect(api.getState().datasource?.error).toBeNull();
        expect(api.getState().data).toEqual([]);
        third.resolve({ data: [users[2]], total: 1, filtered: 1 });
        await tick();
        expect(api.getState().data[0].original.id).toBe(3);
        expect(api.getState().datasource?.loading).toBe(false);
    });

    it('同一輪查詢合併一次請求，較新的回應不會被較晚完成的舊回應覆蓋', async () => {
        const old = deferred<TrellisResponse<User>>();
        const fetch = vi
            .fn<TrellisDatasource<User>['fetch']>()
            .mockReturnValueOnce(old.promise)
            .mockResolvedValue({ data: [users[1]], total: 1, filtered: 1 });
        const api = setup({ fetch });
        await tick();
        api.emit('filter:change', { query: 'a' });
        api.emit('filter:change', { query: 'b' });
        api.emit('filter:change', { query: 'c' });
        await tick();
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch.mock.lastCall?.[0].filter?.global).toBe('c');
        old.resolve({ data: [users[0]], total: 1, filtered: 1 });
        await tick();
        expect(api.getState().data[0].original.id).toBe(2);
    });

    it('可訂閱錯誤、重試與重新載入，錯誤不會清掉上次成功資料', async () => {
        const fetch = vi.fn(createStaticDatasource(users).fetch);
        const api = setup({ fetch });
        const statuses: boolean[] = [];
        api.subscribe((state) => statuses.push(state.datasource!.loading));
        await tick();
        fetch.mockRejectedValueOnce(new Error('Service unavailable'));
        api.emit('datasource:reload');
        await tick();
        expect(api.getState().datasource?.error?.message).toBe(
            'Service unavailable',
        );
        expect(api.getState().data).toHaveLength(2);
        api.emit('datasource:retry');
        await tick();
        expect(api.getState().datasource?.error).toBeNull();
        expect(api.getState().datasource?.loading).toBe(false);
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(statuses).toContain(true);
        expect(statuses.at(-1)).toBe(false);
    });

    it('取消進行中與尚未送出的請求；重試可再啟動', async () => {
        const pending = deferred<TrellisResponse<User>>();
        const fetch = vi
            .fn<TrellisDatasource<User>['fetch']>()
            .mockReturnValueOnce(pending.promise)
            .mockResolvedValue({ data: [], total: 0, filtered: 0 });
        const api = setup({ fetch });
        await tick();
        api.emit('datasource:cancel');
        expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
        pending.resolve({ data: [users[0]], total: 1, filtered: 1 });
        await tick();
        expect(api.getState().data).toEqual([]);
        expect(api.getState().datasource?.loading).toBe(false);
        api.emit('datasource:reload');
        api.emit('datasource:cancel');
        await tick();
        expect(fetch).toHaveBeenCalledTimes(1);
        api.emit('datasource:retry');
        await tick();
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('自訂 datasource 的錯誤結構也會進入 error', async () => {
        const api = setup({
            fetch: async () => ({ data: [], total: 12, filtered: 5 }),
        });
        await tick();
        expect(api.getState().datasource?.error?.message).toMatch(
            /expected 2, received 0/,
        );
        expect(api.getState().datasource?.loading).toBe(false);
    });

    it('destroy 取消請求、移除訂閱，晚到的回應不再改變狀態', async () => {
        const pending = deferred<TrellisResponse<User>>();
        const fetch = vi
            .fn<TrellisDatasource<User>['fetch']>()
            .mockReturnValue(pending.promise);
        const api = setup({ fetch });
        await tick();
        tables.at(-1)!.destroy();
        const state = api.getState();
        expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
        pending.resolve({ data: [users[0]], total: 1, filtered: 1 });
        await tick();
        expect(api.getState()).toBe(state);
        api.emit('datasource:retry');
        await tick();
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
