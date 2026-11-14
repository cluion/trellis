import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { Trellis } from '../packages/core/src';
import {
    createDatasourcePlugin,
    createRemoteDatasource,
    createStaticDatasource,
} from '../packages/plugin-datasource/src';
import type { TrellisQuery } from '../packages/plugin-datasource/src';
import { createFilterPlugin } from '../packages/plugin-filter/src';
import { createPaginationPlugin } from '../packages/plugin-pagination/src';
import { createSortPlugin } from '../packages/plugin-sort/src';
import { buildResponse } from '../packages/server/src';
import { parseTrellisQuery } from '../packages/server/src/query-parser';

const users = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    city: index % 2 ? 'Tokyo' : 'Taipei',
}));
type User = (typeof users)[number];
const tables: Trellis<User>[] = [];
const servers: Server[] = [];

async function serve(
    handler: (
        request: IncomingMessage,
        response: ServerResponse,
    ) => Promise<void>,
) {
    const server = createServer((request, response) => {
        void handler(request, response).catch(() => {
            response.statusCode = 500;
            response.end();
        });
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();

    if (!address || typeof address === 'string') {
        throw new Error('Expected a local TCP server');
    }

    return `http://127.0.0.1:${address.port}/users?tenant=demo`;
}

async function queryFromRequest(
    request: IncomingMessage,
): Promise<TrellisQuery> {
    if (request.method === 'GET') {
        return parseTrellisQuery(
            Object.fromEntries(
                new URL(request.url!, 'http://localhost').searchParams,
            ),
        );
    }

    let body = '';

    for await (const chunk of request) {
        body += chunk;
    }

    return parseTrellisQuery(JSON.parse(body));
}

function table(
    url: string,
    method: 'GET' | 'POST' = 'GET',
    initialQuery?: Partial<TrellisQuery>,
) {
    const trellis = new Trellis<User>({
        data: [],
        columns: [
            { id: 'id', accessor: 'id', header: 'ID' },
            { id: 'city', accessor: 'city', header: 'City' },
        ],
        pageSize: 2,
        rowId: 'id',
        plugins: [
            createDatasourcePlugin({
                datasource: createRemoteDatasource<User>({ url, method }),
                initialQuery,
            }),
            createFilterPlugin(),
            createSortPlugin(),
            createPaginationPlugin(),
        ],
    });
    tables.push(trellis);

    return trellis.api;
}

afterEach(async () => {
    tables.splice(0).forEach((trellis) => trellis.destroy());
    await Promise.all(
        servers.splice(0).map((server) => {
            server.closeAllConnections();

            return new Promise<void>((resolve) =>
                server.close(() => resolve()),
            );
        }),
    );
});

describe('server-side 本機真實 HTTP', () => {
    it.each([
        {
            name: '完整頁面',
            data: users,
            page: 1,
            filter: undefined,
            ids: [1, 2],
            total: 6,
            filtered: 6,
            totalPages: 3,
        },
        {
            name: '最後一頁',
            data: users,
            page: 2,
            filter: { global: 'Taipei' },
            ids: [5],
            total: 6,
            filtered: 3,
            totalPages: 2,
        },
        {
            name: '搜尋零筆',
            data: users,
            page: 1,
            filter: { global: 'Osaka' },
            ids: [],
            total: 6,
            filtered: 0,
            totalPages: 1,
        },
        {
            name: '空資料集',
            data: [],
            page: 1,
            filter: undefined,
            ids: [],
            total: 0,
            filtered: 0,
            totalPages: 1,
        },
        {
            name: '越界頁面',
            data: users,
            page: 4,
            filter: undefined,
            ids: [],
            total: 6,
            filtered: 6,
            totalPages: 3,
        },
        {
            name: '搜尋零筆的越界頁面',
            data: users,
            page: 4,
            filter: { global: 'Osaka' },
            ids: [],
            total: 6,
            filtered: 0,
            totalPages: 1,
        },
    ])(
        'buildResponse 的$name通過 HTTP datasource 驗證',
        async ({ data, page, filter, ids, total, filtered, totalPages }) => {
            const backend = createStaticDatasource<User>(data);
            const url = await serve(async (request, response) => {
                const query = await queryFromRequest(request);
                const result = await backend.fetch(query);
                response.setHeader('Content-Type', 'application/json');
                response.end(
                    JSON.stringify(
                        buildResponse(result.data, {
                            total: result.total,
                            filtered: result.filtered,
                            query,
                        }),
                    ),
                );
            });
            const datasource = createRemoteDatasource<User>({
                url,
                method: 'GET',
            });
            const result = await datasource.fetch({
                page,
                pageSize: 2,
                filter,
            });
            expect(result.data.map((row) => row.id)).toEqual(ids);
            expect(result).toMatchObject({
                total,
                filtered,
                page,
                pageSize: 2,
                totalPages,
            });
        },
    );

    it('GET 與 server parser 串接，跨頁搜尋排序並保留遠端總數', async () => {
        const queries: TrellisQuery[] = [];
        const tenants: (string | null)[] = [];
        const backend = createStaticDatasource(users);
        const url = await serve(async (request, response) => {
            tenants.push(
                new URL(request.url!, 'http://localhost').searchParams.get(
                    'tenant',
                ),
            );
            const query = await queryFromRequest(request);
            queries.push(query);
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(await backend.fetch(query)));
        });
        const api = table(url, 'GET', { page: 2 });
        const ids = () => api.getState().data.map((row) => row.original.id);
        await expect.poll(ids).toEqual([3, 4]);
        api.emit('filter:change', { query: 'Taipei' });
        await expect.poll(ids).toEqual([1, 3]);
        api.emit('sort:change', { columnId: 'id', direction: 'desc' });
        await expect.poll(ids).toEqual([5, 3]);
        api.emit('pagination:next');
        await expect.poll(ids).toEqual([1]);
        expect(api.getState().pagination).toEqual({
            page: 2,
            pageSize: 2,
            totalItems: 3,
        });
        expect(api.getState().datasource).toEqual({
            loading: false,
            error: null,
            total: 6,
            filtered: 3,
        });
        expect(queries.map((query) => query.page)).toEqual([2, 1, 1, 2]);
        expect(tenants).toEqual(['demo', 'demo', 'demo', 'demo']);
    });

    it('POST JSON 與真實 HTTP 503 錯誤重試', async () => {
        let attempts = 0;
        const methods: (string | undefined)[] = [];
        const backend = createStaticDatasource(users);
        const url = await serve(async (request, response) => {
            attempts++;
            methods.push(request.method);
            const query = await queryFromRequest(request);

            if (attempts === 1) {
                response.statusCode = 503;
                response.end();

                return;
            }

            response.end(JSON.stringify(await backend.fetch(query)));
        });
        const api = table(url, 'POST');
        await expect
            .poll(() => api.getState().datasource?.error?.message)
            .toContain('503');
        expect(api.getState().datasource?.loading).toBe(false);
        api.emit('datasource:retry');
        await expect
            .poll(() => api.getState().data.map((row) => row.original.id))
            .toEqual([1, 2]);
        expect(api.getState().datasource?.error).toBeNull();
        expect(methods).toEqual(['POST', 'POST']);
    });

    it('查詢變更會中止真實的未完成連線，並載入新查詢', async () => {
        let slowStarted = false;
        let slowClosed = false;
        const backend = createStaticDatasource(users);
        const url = await serve(async (request, response) => {
            const query = await queryFromRequest(request);

            if (query.filter?.global === 'slow') {
                slowStarted = true;
                response.on('close', () => {
                    slowClosed = !response.writableEnded;
                });

                return;
            }

            response.end(JSON.stringify(await backend.fetch(query)));
        });
        const api = table(url);
        await expect.poll(() => api.getState().data.length).toBe(2);
        api.emit('filter:change', { query: 'slow' });
        await expect.poll(() => slowStarted).toBe(true);
        api.emit('filter:change', { query: 'Taipei' });
        await expect
            .poll(() => api.getState().data.map((row) => row.original.id))
            .toEqual([1, 3]);
        await expect.poll(() => slowClosed).toBe(true);
        expect(api.getState().datasource?.error).toBeNull();
    });
});
