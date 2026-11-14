import { describe, expect, it } from 'vitest';
import { buildResponse } from '../src';
import type { TrellisServerQuery } from '../src';

const query: TrellisServerQuery = { page: 1, pageSize: 3 };
const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];

describe('buildResponse 回應契約', () => {
    it.each([
        {
            page: 1,
            pageSize: 3,
            total: 20,
            filtered: 8,
            ids: [1, 2, 3],
            totalPages: 3,
        },
        {
            page: 2,
            pageSize: 3,
            total: 20,
            filtered: 8,
            ids: [4, 5, 6],
            totalPages: 3,
        },
        {
            page: 3,
            pageSize: 3,
            total: 20,
            filtered: 8,
            ids: [7, 8],
            totalPages: 3,
        },
        {
            page: 3,
            pageSize: 3,
            total: 20,
            filtered: 9,
            ids: [7, 8, 9],
            totalPages: 3,
        },
        { page: 1, pageSize: 3, total: 0, filtered: 0, ids: [], totalPages: 1 },
        {
            page: 1,
            pageSize: 3,
            total: 20,
            filtered: 0,
            ids: [],
            totalPages: 1,
        },
        {
            page: 4,
            pageSize: 3,
            total: 20,
            filtered: 8,
            ids: [],
            totalPages: 3,
        },
        {
            page: 4,
            pageSize: 3,
            total: 20,
            filtered: 0,
            ids: [],
            totalPages: 1,
        },
    ])(
        '保留 page=$page、total=$total、filtered=$filtered 的合法頁面',
        ({ page, pageSize, total, filtered, ids, totalPages }) => {
            const data = ids.map((id) => ({ id }));
            expect(
                buildResponse(data, {
                    total,
                    filtered,
                    query: { page, pageSize },
                }),
            ).toEqual({ data, total, filtered, page, pageSize, totalPages });
        },
    );

    describe.each(['total', 'filtered'] as const)('%s 計數', (field) => {
        it.each([
            -1,
            0.5,
            NaN,
            Infinity,
            -Infinity,
            Number.MAX_SAFE_INTEGER + 1,
            '3',
            3n,
            null,
            undefined,
        ])('拒絕非負安全整數以外的值 %s', (value) => {
            expect(() =>
                buildResponse([], {
                    total: 0,
                    filtered: 0,
                    query,
                    [field]: value,
                } as never),
            ).toThrow(/counts.*safe integers/);
        });
    });

    it('拒絕 filtered 大於 total', () => {
        expect(() =>
            buildResponse(rows, { total: 2, filtered: 3, query }),
        ).toThrow(/filtered <= total/);
    });

    it.each([
        { page: 1, filtered: 8, data: [{ id: 1 }, { id: 2 }] },
        { page: 1, filtered: 8, data: [...rows, { id: 4 }] },
        { page: 2, filtered: 8, data: [] },
        { page: 3, filtered: 8, data: [{ id: 7 }] },
        { page: 3, filtered: 8, data: rows },
        { page: 1, filtered: 0, data: [{ id: 1 }] },
        { page: 4, filtered: 8, data: [{ id: 1 }] },
        { page: 4, filtered: 0, data: [{ id: 1 }] },
    ])(
        '拒絕 page=$page、filtered=$filtered 的錯誤頁長 $data',
        ({ page, filtered, data }) => {
            expect(() =>
                buildResponse(data, {
                    total: 20,
                    filtered,
                    query: { page, pageSize: 3 },
                }),
            ).toThrow(/data length/);
        },
    );

    it.each([null, undefined, {}, 'rows', 3])('拒絕非陣列 data %j', (data) => {
        expect(() =>
            buildResponse(data as never, { total: 0, filtered: 0, query }),
        ).toThrow(/data.*array/);
    });

    it.each([null, undefined, 1, 'row', true, []])(
        '拒絕非資料列物件 %j',
        (row) => {
            expect(() =>
                buildResponse([row], { total: 1, filtered: 1, query }),
            ).toThrow(/row objects/);
        },
    );

    it('拒絕缺少資料列的稀疏陣列', () => {
        expect(() =>
            buildResponse(new Array(1), { total: 1, filtered: 1, query }),
        ).toThrow(/row objects/);
    });

    describe.each(['page', 'pageSize'] as const)('%s 分頁', (field) => {
        it.each([
            0,
            -1,
            1.5,
            NaN,
            Infinity,
            Number.MAX_SAFE_INTEGER + 1,
            '1',
            undefined,
        ])('拒絕不合法的值 %j 而非正規化', (value) => {
            expect(() =>
                buildResponse([], {
                    total: 0,
                    filtered: 0,
                    query: { ...query, [field]: value } as never,
                }),
            ).toThrow(RangeError);
        });
    });

    it('拒絕正整數頁碼產生的不安全 offset', () => {
        expect(() =>
            buildResponse([], {
                total: 0,
                filtered: 0,
                query: { page: Number.MAX_SAFE_INTEGER, pageSize: 2 },
            }),
        ).toThrow(/safe offset/);
    });

    it.each([null, undefined, []])('明確拒絕無效 options %j', (options) => {
        expect(() => buildResponse([], options as never)).toThrow(
            /options.*query/,
        );
    });

    it.each([null, undefined, []])('明確拒絕無效 query %j', (value) => {
        expect(() =>
            buildResponse([], { total: 0, filtered: 0, query: value as never }),
        ).toThrow(/options.*query/);
    });

    it('保留安全整數上限的計數與最後一頁', () => {
        const total = Number.MAX_SAFE_INTEGER;
        expect(
            buildResponse([{ id: 'last' }], {
                total,
                filtered: total,
                query: { page: total, pageSize: 1 },
            }),
        ).toEqual({
            data: [{ id: 'last' }],
            total,
            filtered: total,
            page: total,
            pageSize: 1,
            totalPages: total,
        });
    });

    it('不修改資料列、查詢或原請求的越界頁碼', () => {
        const data = Object.freeze([]) as unknown as { id: number }[];
        const requested = Object.freeze({ page: 10, pageSize: 3 });
        const options = Object.freeze({
            total: 20,
            filtered: 8,
            query: requested,
        });
        const response = buildResponse(data, options);
        expect(response.data).toBe(data);
        expect(response.page).toBe(10);
        expect(response.totalPages).toBe(3);
        expect(options.query).toBe(requested);
    });
});
