import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import process from 'node:process';
import { after, before, beforeEach, test } from 'node:test';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaPg } from '@prisma/adapter-pg';
import { createRemoteDatasource } from '../../../packages/plugin-datasource/dist/index.mjs';
import type { TrellisServerQuery } from '../../../packages/server/dist/index.mjs';
import {
    PrismaConsistencyError,
    trellisPrismaQuery,
    withPrismaSnapshot,
} from '../../../packages/server-prisma/dist/index.mjs';
import type { PrismaAdapterOptions } from '../../../packages/server-prisma/dist/index.mjs';
import type * as Adapter from '../../../packages/server-prisma/dist/index.mjs';
import { Prisma, PrismaClient } from './generated/client/client.ts';

const provider = process.env.TRELLIS_TEST_PROVIDER;
assert.ok(provider === 'mysql' || provider === 'postgresql');
const url = new URL(process.env.TRELLIS_TEST_DATABASE_URL!);
assert.equal(url.pathname, '/trellis_prisma7_test');
const require = createRequire(import.meta.url);

function client() {
    const adapter =
        provider === 'mysql'
            ? new PrismaMariaDb({
                  host: url.hostname,
                  port: Number(url.port || 3306),
                  user: decodeURIComponent(url.username),
                  password: decodeURIComponent(url.password),
                  database: url.pathname.slice(1),
                  connectionLimit: 1,
              })
            : new PrismaPg({ connectionString: url.href, max: 1 });

    return new PrismaClient({ adapter });
}

const reader = client();
const writer = client();
interface Row {
    id: number;
    name: string;
    email: string;
}
const options: PrismaAdapterOptions = {
    select: { id: true, name: true, email: true },
    searchableColumns: ['name', 'email'],
    filterableColumns: ['name', 'email'],
    sortableColumns: ['id', 'name', 'email'],
};
const query: TrellisServerQuery = {
    page: 1,
    pageSize: 5,
    sort: [{ columnId: 'id', direction: 'asc' }],
};
const east: TrellisServerQuery = { ...query, filter: { global: 'east.test' } };
const seed = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    name: `User ${String(index + 1).padStart(2, '0')}`,
    email: `${index + 1}@${index % 2 ? 'east' : 'west'}.test`,
    privateField: 'never-return-this-field',
}));

before(async () => {
    const version = await reader.$queryRawUnsafe<{ version: string }[]>(
        'SELECT version() AS version',
    );
    await writeFile(
        `reports/${provider}-environment.json`,
        JSON.stringify(
            {
                provider,
                version: version[0].version,
                prisma: Prisma.prismaVersion.client,
                node: process.version,
            },
            null,
            2,
        ),
    );
});

beforeEach(async () => {
    await writer.user.deleteMany();
    await writer.user.createMany({ data: seed });
});

after(async () => {
    await reader.$disconnect();
    await writer.$disconnect();
});

// The write uses a separate client and commits before the reader continues.
function interleave(
    model: Prisma.TransactionClient['user'],
    afterCount: number,
    write: () => Promise<unknown>,
) {
    let counts = 0;

    return {
        async count(args?: Prisma.UserCountArgs) {
            const value = await model.count(args);

            if (++counts === afterCount) {
                await write();
            }

            return value;
        },
        findMany: (args?: Prisma.UserFindManyArgs) => model.findMany(args),
    };
}

async function validResponse(result: unknown, requested: TrellisServerQuery) {
    // Native loopback HTTP exercises the public frontend response validator.
    const { createServer } = await import('node:http');
    const server = createServer((_request, response) => {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify(result));
    });
    await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    assert.ok(address && typeof address !== 'string');

    try {
        return await createRemoteDatasource<Row>({
            url: `http://127.0.0.1:${address.port}/users`,
        }).fetch(requested);
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
}

test('projection, search, column filters, sort, pagination, zero and out-of-range', async () => {
    const result = await withPrismaSnapshot(reader, (tx) =>
        trellisPrismaQuery<Row>(tx.user, east, options),
    );
    assert.equal(result.total, 12);
    assert.equal(result.filtered, 6);
    assert.deepEqual(
        result.data.map((row) => row.id),
        [2, 4, 6, 8, 10],
    );
    assert.deepEqual(Object.keys(result.data[0]).sort(), [
        'email',
        'id',
        'name',
    ]);
    await validResponse(result, east);
    const descending = {
        ...east,
        page: 2,
        sort: [{ columnId: 'id', direction: 'desc' as const }],
    };
    const last = await withPrismaSnapshot(reader, (tx) =>
        trellisPrismaQuery<Row>(tx.user, descending, options),
    );
    assert.deepEqual(
        last.data.map((row) => row.id),
        [2],
    );
    assert.equal(last.filtered, 6);
    await validResponse(last, descending);
    const column = { ...query, filter: { columns: { name: 'User 12' } } };
    const filtered = await withPrismaSnapshot(reader, (tx) =>
        trellisPrismaQuery<Row>(tx.user, column, options),
    );
    assert.equal(filtered.filtered, 1);
    assert.deepEqual(
        filtered.data.map((row) => row.id),
        [12],
    );

    for (const requested of [
        { ...east, page: 3 },
        { ...query, filter: { global: 'absent' } },
    ]) {
        const empty = await withPrismaSnapshot(reader, (tx) =>
            trellisPrismaQuery<Row>(tx.user, requested, options),
        );
        assert.deepEqual(empty.data, []);
        assert.equal(empty.total, 12);
        await validResponse(empty, requested);
    }
});

test('provider string mode and column mapping use generated clients', async () => {
    const mapped = await withPrismaSnapshot(reader, (tx) =>
        trellisPrismaQuery<Row>(
            tx.user,
            {
                ...query,
                sort: [{ columnId: 'label', direction: 'desc' }],
                filter: { columns: { label: 'User 12' } },
            },
            {
                ...options,
                columnMap: { label: 'name' },
                sortableColumns: ['label'],
                filterableColumns: ['label'],
            },
        ),
    );
    assert.deepEqual(
        mapped.data.map((row) => row.id),
        [12],
    );
    const search = { ...query, filter: { global: 'user 12' } };
    const result = await withPrismaSnapshot(reader, (tx) =>
        trellisPrismaQuery<Row>(tx.user, search, {
            ...options,
            ...(provider === 'postgresql'
                ? { stringFilterMode: 'insensitive' as const }
                : {}),
        }),
    );
    assert.equal(result.filtered, 1);
});

test('unauthorized fields reject before a model query reaches the database', async () => {
    let calls = 0;
    const model = {
        count: async () => {
            calls++;

            return reader.user.count();
        },
        findMany: async () => {
            calls++;

            return reader.user.findMany();
        },
    };
    await assert.rejects(
        trellisPrismaQuery(
            model,
            {
                ...query,
                sort: [{ columnId: 'privateField', direction: 'asc' }],
            },
            options,
        ),
        /not allowed/,
    );
    await assert.rejects(
        trellisPrismaQuery(model, query, {} as PrismaAdapterOptions),
        /select/,
    );
    assert.equal(calls, 0);
});

test('the transaction uses RepeatableRead on the actual database', async () => {
    await withPrismaSnapshot(reader, async (tx) => {
        const isolation = await tx.$queryRawUnsafe<Record<string, string>[]>(
            provider === 'mysql'
                ? 'SELECT @@transaction_isolation AS level'
                : 'SHOW transaction_isolation',
        );
        assert.match(Object.values(isolation[0])[0], /repeatable.?read/i);
    });
});

test('an existing ReadCommitted transaction cannot be passed as the root client', async () => {
    await reader.$transaction(
        async (tx) => {
            await assert.rejects(
                withPrismaSnapshot(
                    tx as unknown as typeof reader,
                    async () => 1,
                ),
                /root Prisma client/,
            );
        },
        { isolationLevel: 'ReadCommitted' },
    );
});

test('an insert between counts is visible to the writer but not the snapshot', async () => {
    const result = await withPrismaSnapshot(reader, (tx) =>
        trellisPrismaQuery<Row>(
            interleave(tx.user, 1, () =>
                writer.user.createMany({
                    data: [13, 14].map((id) => ({ ...seed[1], id })),
                }),
            ),
            east,
            options,
        ),
    );
    assert.equal(await writer.user.count(), 14);
    assert.equal(result.total, 12);
    assert.equal(result.filtered, 6);
    assert.deepEqual(
        result.data.map((row) => row.id),
        [2, 4, 6, 8, 10],
    );
    await validResponse(result, east);
});

test('a delete between filtered count and rows retains the old last page', async () => {
    const requested = { ...east, page: 2 };
    const result = await withPrismaSnapshot(reader, (tx) =>
        trellisPrismaQuery<Row>(
            interleave(tx.user, 2, () =>
                writer.user.delete({ where: { id: 12 } }),
            ),
            requested,
            options,
        ),
    );
    assert.equal(await writer.user.count(), 11);
    assert.equal(result.total, 12);
    assert.equal(result.filtered, 6);
    assert.deepEqual(
        result.data.map((row) => row.id),
        [12],
    );
    await validResponse(result, requested);
});

test('an update between counts cannot change snapshot membership', async () => {
    const result = await withPrismaSnapshot(reader, (tx) =>
        trellisPrismaQuery<Row>(
            interleave(tx.user, 1, () =>
                writer.user.updateMany({
                    data: { email: 'changed@west.test' },
                    where: { id: { in: [2, 4, 6, 8, 10, 12] } },
                }),
            ),
            east,
            options,
        ),
    );
    assert.equal(
        await writer.user.count({
            where: { email: { contains: 'east.test' } },
        }),
        0,
    );
    assert.equal(result.filtered, 6);
    assert.deepEqual(
        result.data.map((row) => row.id),
        [2, 4, 6, 8, 10],
    );
    await validResponse(result, east);
});

test('unfiltered pagination also reads counts and rows from one snapshot', async () => {
    const requested = { ...query, page: 3 };
    const result = await withPrismaSnapshot(reader, (tx) =>
        trellisPrismaQuery<Row>(
            interleave(tx.user, 1, () =>
                writer.user.deleteMany({ where: { id: { gt: 10 } } }),
            ),
            requested,
            options,
        ),
    );
    assert.equal(await writer.user.count(), 10);
    assert.equal(result.total, 12);
    assert.deepEqual(
        result.data.map((row) => row.id),
        [11, 12],
    );
    await validResponse(result, requested);
});

test('without a snapshot, count and row races are explicitly rejected', async () => {
    await assert.rejects(
        trellisPrismaQuery(
            interleave(reader.user, 1, () =>
                writer.user.createMany({
                    data: [13, 14, 15, 16, 17, 18, 19].map((id) => ({
                        ...seed[1],
                        id,
                    })),
                }),
            ),
            east,
            options,
        ),
        PrismaConsistencyError,
    );
    assert.equal(await writer.user.count(), 19);
    await assert.rejects(
        trellisPrismaQuery(
            interleave(reader.user, 1, () =>
                writer.user.deleteMany({ where: { id: { gt: 10 } } }),
            ),
            { ...query, page: 3 },
            options,
        ),
        PrismaConsistencyError,
    );
});

test('CommonJS exports use the same snapshot contract', async () => {
    const cjs =
        require('../../../packages/server-prisma/dist/index.js') as typeof Adapter;
    const result = await cjs.withPrismaSnapshot(reader, (tx) =>
        cjs.trellisPrismaQuery<Row>(tx.user, east, options),
    );
    assert.equal(result.total, 12);
    assert.equal(result.filtered, 6);
    await validResponse(result, east);
});

test('a failed snapshot propagates the error and releases its connection', async () => {
    const failure = new Error('test callback failure');
    await assert.rejects(
        withPrismaSnapshot(reader, async (tx) => {
            await tx.user.count();

            throw failure;
        }),
        (error) => error === failure,
    );
    const next = await withPrismaSnapshot(reader, (tx) =>
        trellisPrismaQuery(tx.user, query, options),
    );
    assert.equal(next.total, 12);
});
