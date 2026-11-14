import { describe, it, expect } from 'vitest';
import {
    parseTrellisQuery,
    buildWhereClause,
    buildOrderByClause,
} from '../src/query-parser';

describe('查詢解析器', () => {
    describe('parseTrellisQuery', () => {
        it('從 HTTP 請求 body 解析查詢', () => {
            const raw = {
                page: 2,
                pageSize: 10,
                sort: [{ columnId: 'name', direction: 'asc' }],
                filter: { global: 'alice' },
            };

            const query = parseTrellisQuery(raw);

            expect(query.page).toBe(2);
            expect(query.pageSize).toBe(10);
            expect(query.sort).toEqual([
                { columnId: 'name', direction: 'asc' },
            ]);
            expect(query.filter?.global).toBe('alice');
        });

        it('從 URL query string 參數解析查詢', () => {
            const raw = {
                page: '1',
                pageSize: '25',
                sort: '[{"columnId":"age","direction":"desc"}]',
                filter: '{"global":"bob"}',
            };

            const query = parseTrellisQuery(raw);

            expect(query.page).toBe(1);
            expect(query.pageSize).toBe(25);
            expect(query.sort).toEqual([
                { columnId: 'age', direction: 'desc' },
            ]);
            expect(query.filter?.global).toBe('bob');
        });

        it('提供預設值當缺少參數', () => {
            const query = parseTrellisQuery({});

            expect(query.page).toBe(1);
            expect(query.pageSize).toBe(10);
            expect(query.sort).toBeUndefined();
            expect(query.filter).toBeUndefined();
        });

        it('驗證 page 不能小於 1', () => {
            const query = parseTrellisQuery({ page: -1, pageSize: 10 });
            expect(query.page).toBe(1);
        });

        it('驗證 pageSize 必須為正整數', () => {
            const query = parseTrellisQuery({ page: 1, pageSize: 0 });
            expect(query.pageSize).toBe(10);
        });

        it('限制 pageSize 上限為 1000', () => {
            const query = parseTrellisQuery({ page: 1, pageSize: 9999 });
            expect(query.pageSize).toBe(1000);
        });
    });

    describe('buildWhereClause', () => {
        it('全域搜尋產生跨欄 OR 條件', () => {
            const columns = ['name', 'email'];
            const clause = buildWhereClause(columns, { global: 'alice' });

            expect(clause.sql).toContain('OR');
            expect(clause.sql).toContain('name');
            expect(clause.sql).toContain('email');
            expect(clause.params).toEqual(['%alice%', '%alice%']);
        });

        it('單欄篩選產生 AND 條件', () => {
            const columns = ['name', 'age'];
            const clause = buildWhereClause(columns, {
                columns: { name: 'bob', age: 25 },
            });

            expect(clause.sql).toContain('AND');
            expect(clause.params).toContain('%bob%');
            expect(clause.params).toContain(25);
        });

        it('無篩選條件時回傳空字串', () => {
            const clause = buildWhereClause(['name'], undefined);
            expect(clause.sql).toBe('');
            expect(clause.params).toEqual([]);
        });
    });

    describe('buildOrderByClause', () => {
        it('產生 ORDER BY 子句', () => {
            const sql = buildOrderByClause(
                [{ columnId: 'name', direction: 'asc' }],
                ['name'],
            );
            expect(sql).toBe('ORDER BY `name` ASC');
        });

        it('多個排序條件', () => {
            const sql = buildOrderByClause(
                [
                    { columnId: 'age', direction: 'desc' },
                    { columnId: 'name', direction: 'asc' },
                ],
                ['age', 'name'],
            );
            expect(sql).toBe('ORDER BY `age` DESC, `name` ASC');
        });

        it('無排序時回傳空字串', () => {
            const sql = buildOrderByClause(undefined, []);
            expect(sql).toBe('');
        });

        it('防範 SQL injection — 欄位名稱只允許安全字元', () => {
            expect(() =>
                buildOrderByClause(
                    [
                        {
                            columnId: 'name; DROP TABLE users--',
                            direction: 'asc',
                        },
                    ],
                    ['name'],
                ),
            ).toThrow(/not allowed/);
        });
    });

    describe('邊界驗證', () => {
        it('拒絕直接呼叫時的稀疏排序陣列', () => {
            expect(() => parseTrellisQuery({ sort: new Array(1) })).toThrow(
                /criterion/,
            );
        });

        it.each([null, [], 'query'])('拒絕非物件 query %j', (raw) => {
            expect(() => parseTrellisQuery(raw as never)).toThrow(/Query must/);
        });

        it.each([
            1.5,
            Infinity,
            -Infinity,
            NaN,
            Number.MAX_SAFE_INTEGER + 1,
            '1.5',
            'Infinity',
            'NaN',
            true,
            [],
            {},
        ])('拒絕不安全的分頁值 %j', (value) => {
            expect(() => parseTrellisQuery({ page: value })).toThrow(
                /safe integer/,
            );
            expect(() => parseTrellisQuery({ pageSize: value })).toThrow(
                /safe integer/,
            );
        });

        it('拒絕安全頁碼產生的不安全 offset', () => {
            expect(() =>
                parseTrellisQuery({
                    page: Number.MAX_SAFE_INTEGER,
                    pageSize: 1000,
                }),
            ).toThrow(/offset/);
        });

        it.each([null, {}, { columnId: 'name', direction: 'invalid' }])(
            '拒絕不合法排序項目 %j',
            (criterion) => {
                expect(() => parseTrellisQuery({ sort: [criterion] })).toThrow(
                    /criterion/,
                );
            },
        );

        it('明確回報無效的 JSON 與 filter 型態', () => {
            expect(() => parseTrellisQuery({ sort: '[' })).toThrow(
                /sort.*JSON/,
            );
            expect(() => parseTrellisQuery({ filter: '{' })).toThrow(
                /filter.*JSON/,
            );
            expect(() => parseTrellisQuery({ filter: [] })).toThrow(
                /filter must/,
            );
            expect(() => parseTrellisQuery({ filter: { global: {} } })).toThrow(
                /global/,
            );
            expect(() =>
                parseTrellisQuery({ filter: { columns: [] } }),
            ).toThrow(/columns/);
        });

        it.each([{ equals: true }, [], Infinity])(
            '拒絕欄位 operator 或無效數值 %j',
            (value) => {
                expect(() =>
                    parseTrellisQuery({ filter: { columns: { name: value } } }),
                ).toThrow(/invalid value/);
            },
        );

        it('拒絕清單以外的欄位，包含空值與看似安全的名稱', () => {
            for (const value of ['secret', '', null]) {
                expect(() =>
                    buildWhereClause(['name'], {
                        columns: { privateField: value },
                    }),
                ).toThrow(/not allowed/);
            }

            expect(() =>
                buildOrderByClause(
                    [{ columnId: 'privateField', direction: 'asc' }],
                    ['name'],
                ),
            ).toThrow(/not allowed/);
            expect(() =>
                buildOrderByClause(
                    [{ columnId: 'name', direction: 'asc' }],
                    undefined as never,
                ),
            ).toThrow(/not allowed/);
            expect(() => buildWhereClause([], { global: 'name' })).toThrow(
                /allowed columns/,
            );
        });

        it('查詢值維持參數化', () => {
            const result = buildWhereClause(['name'], {
                columns: { name: "'; DROP TABLE users;--" },
            });
            expect(result.sql).toBe("WHERE `name` LIKE ? ESCAPE '!'");
            expect(result.params).toEqual(["%'; DROP TABLE users;--%"]);
        });
    });
});
