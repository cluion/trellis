import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import {
    buildOrderByClause,
    buildWhereClause,
} from '../../../packages/server/dist/index.mjs';
import type {
    SqlQueryOptions,
    TrellisServerQuery,
} from '../../../packages/server/dist/index.mjs';
import type * as Server from '../../../packages/server/dist/index.mjs';
import { createClient, provider } from './database.ts';

const client = createClient();
const require = createRequire(import.meta.url);
const options: SqlQueryOptions = { dialect: provider };
const seed = [
    { id: 1, orderValue: 'plain', groupValue: 'Group A', selectValue: 'alpha' },
    {
        id: 2,
        orderValue: '100% ready',
        groupValue: 'Group A',
        selectValue: 'percent',
    },
    {
        id: 3,
        orderValue: '100X ready',
        groupValue: 'Group B',
        selectValue: 'plain',
    },
    { id: 4, orderValue: 'a_b', groupValue: 'Group B', selectValue: 'under' },
    { id: 5, orderValue: 'acb', groupValue: 'Group C', selectValue: 'plain' },
    {
        id: 6,
        orderValue: 'bang!value',
        groupValue: 'Group C',
        selectValue: 'bang',
    },
    {
        id: 7,
        orderValue: 'back\\slash',
        groupValue: 'Group D',
        selectValue: 'backslash',
    },
    {
        id: 8,
        orderValue: "O'Reilly",
        groupValue: 'Group D',
        selectValue: 'quote',
    },
    {
        id: 9,
        orderValue: '中文😊',
        groupValue: 'Group E',
        selectValue: 'unicode',
    },
    {
        id: 10,
        orderValue: "%_!\\' combo",
        groupValue: 'Group E',
        selectValue: 'combo',
    },
];
const literalCases: [string, number[]][] = [
    ['%', [2, 10]],
    ['_', [4, 10]],
    ['!', [6, 10]],
    ['\\', [7, 10]],
    ["'", [8, 10]],
    ['中文😊', [9]],
    ["%_!\\'", [10]],
];

before(async () => {
    await client.sqlRow.deleteMany();
    await client.sqlRow.createMany({ data: seed });
});
after(async () => client.$disconnect());

async function ids(
    filter: TrellisServerQuery['filter'],
    settings: SqlQueryOptions = {},
) {
    const where = buildWhereClause(['order'], filter, {
        ...options,
        ...settings,
    });
    const rows = await client.$queryRawUnsafe<{ id: number }[]>(
        `SELECT id FROM trellis_sql_row ${where.sql} ORDER BY id`,
        ...where.params,
    );

    return rows.map((row) => row.id);
}

for (const [value, expected] of literalCases) {
    test(`SQL global search treats ${JSON.stringify(value)} literally`, async () => {
        assert.deepEqual(await ids({ global: value }), expected);
    });
    test(`SQL column search treats ${JSON.stringify(value)} literally`, async () => {
        assert.deepEqual(await ids({ columns: { order: value } }), expected);
    });
}

test('reserved identifiers work in search, filtering, sort and pagination', async () => {
    const where = buildWhereClause(
        ['group', 'select'],
        { global: 'Group', columns: { group: 'Group A' } },
        options,
    );
    const order = buildOrderByClause(
        [{ columnId: 'select', direction: 'desc' }],
        ['select'],
        options,
    );
    const limit =
        provider === 'postgresql'
            ? `$${where.params.length + 1} OFFSET $${where.params.length + 2}`
            : '? OFFSET ?';
    const result = await client.$queryRawUnsafe<{ id: number }[]>(
        `SELECT id FROM trellis_sql_row ${where.sql} ${order} LIMIT ${limit}`,
        ...where.params,
        1,
        1,
    );
    assert.deepEqual(
        result.map((row) => row.id),
        [1],
    );
    const [count] = await client.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) AS count FROM trellis_sql_row ${where.sql}`,
        ...where.params,
    );
    assert.equal(Number(count.count), 2);
});

test('wildcard matching is explicit and still treats the escape character literally', async () => {
    assert.deepEqual(await ids({ global: 'a_b' }), [4]);
    assert.deepEqual(
        await ids({ global: 'a_b' }, { likeMode: 'wildcard' }),
        [4, 5],
    );
    assert.deepEqual(await ids({ global: '100%' }), [2]);
    assert.deepEqual(
        await ids({ global: '100%' }, { likeMode: 'wildcard' }),
        [2, 3],
    );
    assert.deepEqual(
        await ids({ global: '!' }, { likeMode: 'wildcard' }),
        [6, 10],
    );
});

test('scope parameters compose with generated bindings in their original order', async () => {
    const where = buildWhereClause(
        ['order'],
        { global: '%' },
        { ...options, parameterOffset: provider === 'postgresql' ? 1 : 0 },
    );
    const first = provider === 'postgresql' ? '$1' : '?';
    const result = await client.$queryRawUnsafe<{ id: number }[]>(
        `SELECT id FROM trellis_sql_row WHERE id >= ${first} AND (${where.sql.slice(6)}) ORDER BY id`,
        3,
        ...where.params,
    );
    assert.deepEqual(
        result.map((row) => row.id),
        [10],
    );
});

test('numeric equality and zero matches preserve parameterized SQL', async () => {
    const where = buildWhereClause(['id'], { columns: { id: 4 } }, options);
    const result = await client.$queryRawUnsafe<{ id: number }[]>(
        `SELECT id FROM trellis_sql_row ${where.sql}`,
        ...where.params,
    );
    assert.deepEqual(
        result.map((row) => row.id),
        [4],
    );
    assert.deepEqual(await ids({ global: 'no matching row' }), []);
    assert.deepEqual(
        buildWhereClause(['order'], { columns: { order: null } }, options),
        { sql: '', params: [] },
    );
});

test('SQL payloads stay bound values and cannot change the dataset', async () => {
    assert.deepEqual(await ids({ global: "' OR 1=1 --" }), []);
    assert.equal(await client.sqlRow.count(), 10);
    assert.throws(
        () =>
            buildWhereClause(
                ['order; DROP TABLE trellis_sql_row'],
                { global: 'x' },
                options,
            ),
        /not allowed/,
    );
});

test('NUL patterns are rejected before sending unsupported text to the database', () => {
    for (const likeMode of ['literal', 'wildcard'] as const) {
        assert.throws(
            () =>
                buildWhereClause(
                    ['order'],
                    { global: '\0' },
                    { ...options, likeMode },
                ),
            /NUL/,
        );
        assert.throws(
            () =>
                buildWhereClause(
                    ['order'],
                    { columns: { order: 'x\0y' } },
                    { ...options, likeMode },
                ),
            /NUL/,
        );
    }
});

test('CommonJS SQL builders execute with the same dialect and literal semantics', async () => {
    const cjs =
        require('../../../packages/server/dist/index.js') as typeof Server;
    const where = cjs.buildWhereClause(['order'], { global: '_' }, options);
    const order = cjs.buildOrderByClause(
        [{ columnId: 'order', direction: 'desc' }],
        ['order'],
        options,
    );
    const result = await client.$queryRawUnsafe<{ id: number }[]>(
        `SELECT id FROM trellis_sql_row ${where.sql} ${order}`,
        ...where.params,
    );
    assert.deepEqual(
        result.map((row) => row.id).sort((a, b) => a - b),
        [4, 10],
    );
});
