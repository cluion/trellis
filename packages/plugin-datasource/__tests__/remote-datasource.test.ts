import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRemoteDatasource } from '../src/remote-datasource';
import type { TrellisResponse } from '../src/types';

// 使用 fetch mock
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function mockResponse(body: unknown, status = 200) {
    return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
    } as Response);
}

describe('遠端資料源', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('向指定 URL 發送 POST 請求', async () => {
        mockFetch.mockReturnValue(
            mockResponse({ data: [], total: 0, filtered: 0 }),
        );

        const ds = createRemoteDatasource({ url: '/api/users' });
        await ds.fetch({ page: 1, pageSize: 10 });

        expect(mockFetch).toHaveBeenCalledOnce();
        const [url, init] = mockFetch.mock.calls[0];
        expect(url).toBe('/api/users');
        expect(init.method).toBe('POST');
    });

    it('將查詢參數序列化為 JSON body', async () => {
        mockFetch.mockReturnValue(
            mockResponse({ data: [], total: 0, filtered: 0 }),
        );

        const ds = createRemoteDatasource({ url: '/api/users' });
        await ds.fetch({
            page: 2,
            pageSize: 25,
            sort: [{ columnId: 'name', direction: 'asc' }],
            filter: { global: 'alice' },
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.page).toBe(2);
        expect(body.pageSize).toBe(25);
        expect(body.sort).toEqual([{ columnId: 'name', direction: 'asc' }]);
        expect(body.filter).toEqual({ global: 'alice' });
    });

    it('解析後端回傳的 TrellisResponse', async () => {
        const serverResponse: TrellisResponse = {
            data: [{ name: 'Alice', age: 30 }],
            total: 100,
            filtered: 1,
        };
        mockFetch.mockReturnValue(mockResponse(serverResponse));

        const ds = createRemoteDatasource({ url: '/api/users' });
        const result = await ds.fetch({ page: 1, pageSize: 10 });

        expect(result.data).toHaveLength(1);
        expect(result.total).toBe(100);
        expect(result.filtered).toBe(1);
    });

    it('支援 GET 方法（查詢參數放在 URL）', async () => {
        mockFetch.mockReturnValue(
            mockResponse({ data: [], total: 0, filtered: 0 }),
        );

        const ds = createRemoteDatasource({ url: '/api/users', method: 'GET' });
        await ds.fetch({ page: 3, pageSize: 10 });

        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain('page=3');
        expect(calledUrl).toContain('pageSize=10');
    });

    it('支援自訂請求標頭', async () => {
        mockFetch.mockReturnValue(
            mockResponse({ data: [], total: 0, filtered: 0 }),
        );

        const ds = createRemoteDatasource({
            url: '/api/users',
            headers: { Authorization: 'Bearer token123' },
        });
        await ds.fetch({ page: 1, pageSize: 10 });

        const headers = mockFetch.mock.calls[0][1].headers;
        expect(headers.Authorization).toBe('Bearer token123');
    });

    it('支援 transformQuery 自訂查詢格式', async () => {
        mockFetch.mockReturnValue(
            mockResponse({ data: [], total: 0, filtered: 0 }),
        );

        const ds = createRemoteDatasource({
            url: '/api/users',
            transformQuery: (query) => ({
                offset: (query.page - 1) * query.pageSize,
                limit: query.pageSize,
                orderby: query.sort?.[0]?.columnId,
                dir: query.sort?.[0]?.direction,
            }),
        });
        await ds.fetch({ page: 2, pageSize: 10 });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.offset).toBe(10);
        expect(body.limit).toBe(10);
        expect(body.orderby).toBeUndefined();
    });

    it('支援 transformResponse 自訂回應格式', async () => {
        mockFetch.mockReturnValue(
            mockResponse({
                rows: [{ name: 'Alice' }],
                total_count: 50,
                filtered_count: 1,
            }),
        );

        const ds = createRemoteDatasource({
            url: '/api/users',
            transformResponse: (res: any) => ({
                data: res.rows,
                total: res.total_count,
                filtered: res.filtered_count,
            }),
        });
        const result = await ds.fetch({ page: 1, pageSize: 10 });

        expect(result.data).toEqual([{ name: 'Alice' }]);
        expect(result.total).toBe(50);
    });

    it('HTTP 錯誤時拋出例外', async () => {
        mockFetch.mockReturnValue(
            mockResponse({ error: 'Internal Server Error' }, 500),
        );

        const ds = createRemoteDatasource({ url: '/api/users' });

        await expect(ds.fetch({ page: 1, pageSize: 10 })).rejects.toThrow(
            /500/,
        );
    });

    it('網路錯誤時拋出例外', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const ds = createRemoteDatasource({ url: '/api/users' });

        await expect(ds.fetch({ page: 1, pageSize: 10 })).rejects.toThrow(
            'Network error',
        );
    });

    it('GET 使用轉換結果並合併既有參數、保留 hash 與重複參數', async () => {
        mockFetch.mockReturnValue(
            mockResponse({ data: [], total: 0, filtered: 0 }),
        );
        const ds = createRemoteDatasource({
            url: '/api/users?tenant=demo&tag=a&tag=b&limit=5#results',
            method: 'GET',
            transformQuery: (query) => ({
                offset: (query.page - 1) * query.pageSize,
                limit: query.pageSize,
                order: query.sort,
                unused: undefined,
            }),
        });
        await ds.fetch({
            page: 2,
            pageSize: 10,
            sort: [{ columnId: 'name', direction: 'desc' }],
        });
        const url = new URL(mockFetch.mock.calls[0][0], 'https://example.test');
        expect(url.searchParams.get('tenant')).toBe('demo');
        expect(url.searchParams.getAll('tag')).toEqual(['a', 'b']);
        expect(url.searchParams.get('offset')).toBe('10');
        expect(url.searchParams.get('limit')).toBe('10');
        expect(JSON.parse(url.searchParams.get('order')!)).toEqual([
            { columnId: 'name', direction: 'desc' },
        ]);
        expect(url.searchParams.has('page')).toBe(false);
        expect(url.searchParams.has('unused')).toBe(false);
        expect(url.hash).toBe('#results');
    });

    it('GET 預設將 sort 與 filter 編碼為 JSON', async () => {
        mockFetch.mockReturnValue(
            mockResponse({ data: [], total: 0, filtered: 0 }),
        );
        const ds = createRemoteDatasource({
            url: 'https://example.test/api?scope=all',
            method: 'GET',
        });
        const query = {
            page: 1,
            pageSize: 10,
            sort: [{ columnId: 'name', direction: 'asc' as const }],
            filter: { global: '中文 & +', columns: { city: 'Taipei' } },
        };
        await ds.fetch(query);
        const url = new URL(mockFetch.mock.calls[0][0]);
        expect(JSON.parse(url.searchParams.get('sort')!)).toEqual(query.sort);
        expect(JSON.parse(url.searchParams.get('filter')!)).toEqual(
            query.filter,
        );
    });

    it('GET 拒絕非物件 transformQuery 結果', async () => {
        const ds = createRemoteDatasource({
            url: '/api',
            method: 'GET',
            transformQuery: () => 'invalid',
        });
        await expect(ds.fetch({ page: 1, pageSize: 10 })).rejects.toThrow(
            /must return an object/,
        );
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it.each(['GET', 'POST'] as const)(
        '%s 傳遞 AbortSignal 並回報取消',
        async (method) => {
            const controller = new AbortController();
            mockFetch.mockImplementation(
                (_url, init) =>
                    new Promise((_resolve, reject) => {
                        init.signal.addEventListener('abort', () =>
                            reject(new DOMException('Aborted', 'AbortError')),
                        );
                    }),
            );
            const pending = createRemoteDatasource({
                url: '/api',
                method,
            }).fetch({ page: 1, pageSize: 10 }, { signal: controller.signal });
            expect(mockFetch.mock.calls[0][1].signal).toBe(controller.signal);
            controller.abort();
            await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
        },
    );

    it.each([
        null,
        {},
        { data: {}, total: 0, filtered: 0 },
        { data: [null], total: 1, filtered: 1 },
        { data: [1], total: 1, filtered: 1 },
        { data: [], total: -1, filtered: 0 },
        { data: [], total: 1.5, filtered: 0 },
        { data: [], total: Infinity, filtered: 0 },
        { data: [], total: Number.MAX_SAFE_INTEGER + 1, filtered: 0 },
        { data: [], total: '10', filtered: 0 },
        { data: [], total: 0, filtered: 1 },
        { data: [], total: 2, filtered: -1 },
        { data: [], total: 2, filtered: 1.5 },
        { data: [], total: 2, filtered: 2 },
        { data: [{}, {}, {}], total: 3, filtered: 3 },
    ])('拒絕不合法回應：%j', async (body) => {
        mockFetch.mockReturnValue(mockResponse(body));
        const ds = createRemoteDatasource({ url: '/api' });
        await expect(ds.fetch({ page: 1, pageSize: 2 })).rejects.toThrow(
            /Invalid TrellisResponse/,
        );
    });

    it('transformResponse 之後仍驗證筆數與最後一頁剩餘數量', async () => {
        mockFetch.mockReturnValue(mockResponse({ rows: [{}, {}] }));
        const ds = createRemoteDatasource({
            url: '/api',
            transformResponse: (raw: any) => ({
                data: raw.rows,
                total: 3,
                filtered: 3,
            }),
        });
        await expect(ds.fetch({ page: 2, pageSize: 2 })).rejects.toThrow(
            /expected 1, received 2/,
        );
    });

    it('合法的越界回應必須是空陣列', async () => {
        mockFetch.mockReturnValue(
            mockResponse({ data: [], total: 3, filtered: 3 }),
        );
        await expect(
            createRemoteDatasource({ url: '/api' }).fetch({
                page: 9,
                pageSize: 2,
            }),
        ).resolves.toEqual({ data: [], total: 3, filtered: 3 });
    });

    it('拒絕稀疏資料陣列，避免筆數正確但實際沒有資料列', async () => {
        mockFetch.mockReturnValue(
            mockResponse({ data: new Array(2), total: 2, filtered: 2 }),
        );
        await expect(
            createRemoteDatasource({ url: '/api' }).fetch({
                page: 1,
                pageSize: 2,
            }),
        ).rejects.toThrow(/Invalid TrellisResponse.data/);
    });

    it('JSON 解析錯誤會明確回報', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => {
                throw new SyntaxError('Invalid JSON');
            },
        });
        await expect(
            createRemoteDatasource({ url: '/api' }).fetch({
                page: 1,
                pageSize: 10,
            }),
        ).rejects.toThrow('Invalid JSON');
    });

    it.each([
        { page: 0, pageSize: 10 },
        { page: 1, pageSize: 0 },
        { page: NaN, pageSize: 10 },
        { page: 1, pageSize: 1.5 },
        { page: Number.MAX_SAFE_INTEGER, pageSize: 10 },
    ])('請求前拒絕無效分頁：%j', async (query) => {
        await expect(
            createRemoteDatasource({ url: '/api' }).fetch(query),
        ).rejects.toThrow(/positive safe integers/);
        expect(mockFetch).not.toHaveBeenCalled();
    });
});
