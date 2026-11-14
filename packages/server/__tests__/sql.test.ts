import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildOrderByClause, buildWhereClause } from '../src/query-parser';
import type { SqlQueryOptions, TrellisServerQuery } from '../src/types';

const rows = [
    { id: 1, order: 'plain', group: 'Group A', select: 'alpha' },
    { id: 2, order: '100% ready', group: 'Group A', select: 'percent' },
    { id: 3, order: '100X ready', group: 'Group B', select: 'plain' },
    { id: 4, order: 'a_b', group: 'Group B', select: 'under' },
    { id: 5, order: 'acb', group: 'Group C', select: 'plain' },
    { id: 6, order: 'bang!value', group: 'Group C', select: 'bang' },
    { id: 7, order: 'back\\slash', group: 'Group D', select: 'backslash' },
    { id: 8, order: "O'Reilly", group: 'Group D', select: 'quote' },
    { id: 9, order: '中文😊', group: 'Group E', select: 'unicode' },
    { id: 10, order: "%_!\\' combo", group: 'Group E', select: 'combo' },
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

describe('SQL builder contracts', () => {
    it.each(['sqlite', 'mysql', 'postgresql'] as const)(
        'quotes authorized reserved identifiers for %s',
        (dialect) => {
            const quote = dialect === 'postgresql' ? '"' : '`';
            expect(
                buildOrderByClause(
                    [{ columnId: 'order', direction: 'desc' }],
                    ['order'],
                    { dialect },
                ),
            ).toBe(`ORDER BY ${quote}order${quote} DESC`);
            const where = buildWhereClause(
                ['group'],
                { columns: { group: 'x' } },
                { dialect },
            );
            expect(where.sql).toBe(
                `WHERE ${quote}group${quote} LIKE ${dialect === 'postgresql' ? '$1' : '?'} ESCAPE '!'`,
            );
        },
    );

    it('numbers PostgreSQL parameters after preceding scope parameters', () => {
        const where = buildWhereClause(
            ['order', 'group'],
            { global: '50%_', columns: { group: '!' } },
            { dialect: 'postgresql', parameterOffset: 2 },
        );
        expect(where.params).toEqual(['%50!%!_%', '%50!%!_%', '%!!%']);
        expect(where.sql).toBe(
            'WHERE ("order" LIKE $3 ESCAPE \'!\' OR "group" LIKE $4 ESCAPE \'!\') AND "group" LIKE $5 ESCAPE \'!\'',
        );
        expect(
            buildWhereClause(
                ['id'],
                { columns: { id: 3 } },
                { dialect: 'postgresql', parameterOffset: 2 },
            ),
        ).toEqual({ sql: 'WHERE "id" = $3', params: [3] });
    });

    it.each([
        null,
        [],
        { dialect: 'unknown' },
        { dialect: null },
        { likeMode: 'raw' },
        { likeMode: null },
        { parameterOffset: 1 },
        { dialect: 'postgresql', parameterOffset: -1 },
        { dialect: 'postgresql', parameterOffset: 1.5 },
        { dialect: 'postgresql', parameterOffset: '1' },
    ])(
        'rejects invalid backend SQL options even for an empty query: %j',
        (options) => {
            expect(() =>
                buildWhereClause([], undefined, options as never),
            ).toThrow();
            expect(() =>
                buildOrderByClause([], [], options as never),
            ).toThrow();
        },
    );

    it('rejects unsafe PostgreSQL parameter indices', () => {
        expect(() =>
            buildWhereClause(
                ['order'],
                { global: 'x' },
                {
                    dialect: 'postgresql',
                    parameterOffset: Number.MAX_SAFE_INTEGER,
                },
            ),
        ).toThrow(/parameter index/);
    });

    it.each([
        'order; DROP TABLE users',
        'users.order',
        '"order"',
        '`order`',
        'x--',
    ])(
        'rejects unsafe identifiers even when present in the allowlist: %s',
        (column) => {
            expect(() => buildWhereClause([column], { global: 'x' })).toThrow(
                /not allowed/,
            );
            expect(() =>
                buildOrderByClause(
                    [{ columnId: column, direction: 'asc' }],
                    [column],
                ),
            ).toThrow(/not allowed/);
        },
    );

    it('rejects non-string and sparse backend column lists', () => {
        expect(() =>
            buildWhereClause([null] as never, { global: 'x' }),
        ).toThrow(/not allowed/);
        expect(() => buildWhereClause(new Array(1), { global: 'x' })).toThrow(
            /not allowed/,
        );
    });
});

describe('SQLite SQL execution', () => {
    let db: DatabaseSync;

    beforeEach(() => {
        db = new DatabaseSync(':memory:');
        db.exec(
            'CREATE TABLE sample (id INTEGER, "order" TEXT, "group" TEXT, "select" TEXT)',
        );
        const insert = db.prepare('INSERT INTO sample VALUES (?, ?, ?, ?)');

        for (const row of rows) {
            insert.run(row.id, row.order, row.group, row.select);
        }
    });

    afterEach(() => db.close());

    function ids(
        filter: TrellisServerQuery['filter'],
        options?: SqlQueryOptions,
    ) {
        const where = buildWhereClause(['order'], filter, options);

        return db
            .prepare(`SELECT id FROM sample ${where.sql} ORDER BY id`)
            .all(...(where.params as string[]))
            .map((row) => row.id);
    }

    it.each(literalCases)(
        'global search treats %s literally',
        (value, expected) => {
            expect(ids({ global: value })).toEqual(expected);
        },
    );

    it.each(literalCases)(
        'column search treats %s literally',
        (value, expected) => {
            expect(ids({ columns: { order: value } })).toEqual(expected);
        },
    );

    it('handles reserved columns in combined search, filtering, sorting and pagination', () => {
        const where = buildWhereClause(['group', 'select'], {
            global: 'Group',
            columns: { group: 'Group E' },
        });
        const order = buildOrderByClause(
            [{ columnId: 'order', direction: 'desc' }],
            ['order'],
        );
        const found = db
            .prepare(
                `SELECT id FROM sample ${where.sql} ${order} LIMIT ? OFFSET ?`,
            )
            .all(...(where.params as string[]), 1, 1);
        expect(found.map((row) => row.id)).toEqual([10]);
        expect(
            db
                .prepare(`SELECT COUNT(*) AS count FROM sample ${where.sql}`)
                .get(...(where.params as string[]))?.count,
        ).toBe(2);
    });

    it('only enables percent/underscore wildcards through explicit options', () => {
        expect(ids({ global: 'a_b' })).toEqual([4]);
        expect(ids({ global: 'a_b' }, { likeMode: 'wildcard' })).toEqual([
            4, 5,
        ]);
        expect(ids({ global: '100%' })).toEqual([2]);
        expect(ids({ global: '100%' }, { likeMode: 'wildcard' })).toEqual([
            2, 3,
        ]);
        expect(ids({ global: '!' }, { likeMode: 'wildcard' })).toEqual([6, 10]);
    });

    it('does not interpret a quoted SQL payload or change stored rows', () => {
        expect(ids({ global: "' OR 1=1 --" })).toEqual([]);
        expect(
            db.prepare('SELECT COUNT(*) AS count FROM sample').get()?.count,
        ).toBe(10);
    });

    it('rejects NUL instead of silently truncating SQLite LIKE patterns', () => {
        expect(
            db
                .prepare("SELECT 'plain' LIKE ? ESCAPE '!' AS matched")
                .get('%\0%')?.matched,
        ).toBe(1);

        for (const likeMode of ['literal', 'wildcard'] as const) {
            expect(() => ids({ global: '\0' }, { likeMode })).toThrow(/NUL/);
            expect(() =>
                ids({ columns: { order: 'x\0y' } }, { likeMode }),
            ).toThrow(/NUL/);
        }
    });

    it('preserves numeric equality, skipped empty filters and zero results', () => {
        const where = buildWhereClause(['id', 'order'], {
            columns: { id: 4, order: null },
        });
        expect(
            db
                .prepare(`SELECT id FROM sample ${where.sql}`)
                .all(...(where.params as number[]))
                .map((row) => row.id),
        ).toEqual([4]);
        expect(ids({ global: 'no match' })).toEqual([]);
        expect(buildWhereClause(['order'], { columns: { order: '' } })).toEqual(
            { sql: '', params: [] },
        );
    });
});
