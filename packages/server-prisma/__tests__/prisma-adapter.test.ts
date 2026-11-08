import type { TrellisServerQuery } from '@trellisjs/server';
import { describe, it, expect, vi } from 'vitest';
import { trellisPrismaQuery } from '../src/prisma-adapter';

// Mock Prisma Model
function createMockModel() {
    return {
        count: vi.fn(),
        findMany: vi.fn(),
    };
}

describe('Prisma 轉接器', () => {
    it('基本查詢 — 無排序無篩選', async () => {
        const model = createMockModel();
        model.count
            .mockResolvedValueOnce(100) // total
            .mockResolvedValueOnce(100); // filtered
        model.findMany.mockResolvedValueOnce([{ name: 'Alice' }]);

        const query: TrellisServerQuery = { page: 1, pageSize: 10 };
        const result = await trellisPrismaQuery(model, query, {
            select: { name: true },
        });

        expect(result.total).toBe(100);
        expect(result.filtered).toBe(100);
        expect(result.data).toEqual([{ name: 'Alice' }]);

        // 驗證 findMany 的 skip/take
        expect(model.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 0,
                take: 10,
            }),
        );
    });

    it('帶排序條件', async () => {
        const model = createMockModel();
        model.count.mockResolvedValue(50);
        model.findMany.mockResolvedValue([]);

        const query: TrellisServerQuery = {
            page: 1,
            pageSize: 10,
            sort: [{ columnId: 'name', direction: 'asc' }],
        };
        await trellisPrismaQuery(model, query, {
            select: { name: true },
            sortableColumns: ['name'],
        });

        expect(model.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: [{ name: 'asc' }],
            }),
        );
    });

    it('帶全域搜尋', async () => {
        const model = createMockModel();
        model.count.mockResolvedValue(50);
        model.findMany.mockResolvedValue([]);

        const query: TrellisServerQuery = {
            page: 1,
            pageSize: 10,
            filter: { global: 'alice' },
        };
        await trellisPrismaQuery(model as any, query, {
            select: { name: true, email: true },
            searchableColumns: ['name', 'email'],
        });

        // count 應該被呼叫兩次 — 一次 total，一次 filtered
        expect(model.count).toHaveBeenCalledTimes(2);

        // findMany 應該有 where 條件
        const findManyCall = model.findMany.mock.calls[0][0];
        expect(findManyCall.where).toBeDefined();
        expect(findManyCall.where.AND[0].OR).toBeDefined();
    });

    it('帶單欄篩選', async () => {
        const model = createMockModel();
        model.count.mockResolvedValue(50);
        model.findMany.mockResolvedValue([]);

        const query: TrellisServerQuery = {
            page: 1,
            pageSize: 10,
            filter: { columns: { status: 'active' } },
        };
        await trellisPrismaQuery(model, query, {
            select: { name: true },
            filterableColumns: ['status'],
        });

        const findManyCall = model.findMany.mock.calls[0][0];
        expect(findManyCall.where.AND[0].status).toBeDefined();
    });

    it('分頁正確計算 skip', async () => {
        const model = createMockModel();
        model.count.mockResolvedValue(100);
        model.findMany.mockResolvedValue([]);

        const query: TrellisServerQuery = { page: 3, pageSize: 10 };
        await trellisPrismaQuery(model, query, { select: { name: true } });

        expect(model.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 20,
                take: 10,
            }),
        );
    });
});

describe('Prisma 安全邊界', () => {
    const query: TrellisServerQuery = { page: 1, pageSize: 10 };

    function model() {
        return {
            count: vi.fn().mockResolvedValue(20),
            findMany: vi.fn().mockResolvedValue([]),
        };
    }

    it.each([undefined, {}, { name: false }, { name: {} }])(
        '沒有明確 scalar projection 時拒絕查詢 %j',
        async (select) => {
            const db = model();
            await expect(
                trellisPrismaQuery(db, query, { select } as never),
            ).rejects.toThrow(/select/);
            expect(db.count).not.toHaveBeenCalled();
            expect(db.findMany).not.toHaveBeenCalled();
        },
    );

    it('只把指定的 scalar 欄位傳給 Prisma', async () => {
        const db = model();
        await trellisPrismaQuery(db, query, {
            select: { id: true, name: true, privateField: false },
        });
        expect(db.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                select: { id: true, name: true, privateField: false },
            }),
        );
    });

    it.each(['sort', 'filter', 'search'])(
        '預設拒絕未授權 %s，且不呼叫資料庫',
        async (kind) => {
            const db = model();
            const requested = {
                ...query,
                ...(kind === 'sort'
                    ? {
                          sort: [
                              {
                                  columnId: 'privateField',
                                  direction: 'asc' as const,
                              },
                          ],
                      }
                    : {
                          filter:
                              kind === 'search'
                                  ? { global: 'x' }
                                  : { columns: { privateField: 'x' } },
                      }),
            };
            await expect(
                trellisPrismaQuery(db, requested, { select: { name: true } }),
            ).rejects.toThrow(/not allowed|searchableColumns/);
            expect(db.count).not.toHaveBeenCalled();
            expect(db.findMany).not.toHaveBeenCalled();
        },
    );

    it('columnMap 不會授予額外權限，允許清單使用前端 column ID', async () => {
        const db = model();
        const requested = {
            ...query,
            sort: [{ columnId: 'label', direction: 'asc' as const }],
        };
        await expect(
            trellisPrismaQuery(db, requested, {
                select: { name: true },
                columnMap: { label: 'name' },
            }),
        ).rejects.toThrow(/not allowed/);
        await trellisPrismaQuery(db, requested, {
            select: { name: true },
            columnMap: { label: 'name' },
            sortableColumns: ['label'],
        });
        expect(db.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: [{ name: 'asc' }] }),
        );
    });

    it.each(['default', 'insensitive'] as const)(
        '字串模式 %s 同時套用於全域與單欄',
        async (stringFilterMode) => {
            const db = model();
            await trellisPrismaQuery(
                db,
                { ...query, filter: { global: 'a', columns: { name: 'b' } } },
                {
                    select: { name: true },
                    searchableColumns: ['name'],
                    filterableColumns: ['name'],
                    stringFilterMode,
                },
            );
            const predicate = (value: string) => ({
                contains: value,
                ...(stringFilterMode === 'insensitive'
                    ? { mode: 'insensitive' }
                    : {}),
            });
            expect(db.findMany.mock.calls[0][0].where).toEqual({
                AND: [
                    { OR: [{ name: predicate('a') }] },
                    { name: predicate('b') },
                ],
            });
            expect(db.count.mock.calls[1][0].where).toEqual(
                db.findMany.mock.calls[0][0].where,
            );
        },
    );

    it('預設不輸出 MySQL 不支援的 mode，並保留多欄排序順序', async () => {
        const db = model();
        await trellisPrismaQuery(
            db,
            {
                ...query,
                filter: { columns: { name: 'a' } },
                sort: [
                    { columnId: 'name', direction: 'asc' },
                    { columnId: 'id', direction: 'desc' },
                ],
            },
            {
                select: { name: true },
                filterableColumns: ['name'],
                sortableColumns: ['name', 'id'],
            },
        );
        expect(db.findMany.mock.calls[0][0].where).toEqual({
            AND: [{ name: { contains: 'a' } }],
        });
        expect(db.findMany.mock.calls[0][0].orderBy).toEqual([
            { name: 'asc' },
            { id: 'desc' },
        ]);
    });

    it('同一 Prisma 欄位的兩個篩選不會互相覆蓋', async () => {
        const db = model();
        await trellisPrismaQuery(
            db,
            { ...query, filter: { columns: { first: 'a', second: 'b' } } },
            {
                select: { name: true },
                filterableColumns: ['first', 'second'],
                columnMap: { first: 'name', second: 'name' },
            },
        );
        expect(db.findMany.mock.calls[0][0].where.AND).toHaveLength(2);
    });

    it.each([
        { page: -1, pageSize: 10 },
        { page: 1.5, pageSize: 10 },
        { page: 1, pageSize: 1001 },
        { page: Number.MAX_SAFE_INTEGER, pageSize: 1000 },
    ])('拒絕直接呼叫時的不合法分頁 %j', async (requested) => {
        const db = model();
        await expect(
            trellisPrismaQuery(db, requested, { select: { name: true } }),
        ).rejects.toThrow();
        expect(db.count).not.toHaveBeenCalled();
    });

    it('拒絕邏輯保留字與 prototype 欄位映射', async () => {
        const db = model();

        for (const field of ['OR', '__proto__', 'constructor']) {
            await expect(
                trellisPrismaQuery(
                    db,
                    { ...query, filter: { columns: { name: 'x' } } },
                    {
                        select: { name: true },
                        filterableColumns: ['name'],
                        columnMap: { name: field },
                    },
                ),
            ).rejects.toThrow(/invalid field/);
        }

        expect(db.count).not.toHaveBeenCalled();
    });
});
