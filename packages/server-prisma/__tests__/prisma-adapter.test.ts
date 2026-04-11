import { describe, it, expect, vi } from 'vitest';
import { trellisPrismaQuery } from '../src/prisma-adapter';
import type { TrellisServerQuery } from '@trellisjs/server';

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
      .mockResolvedValueOnce(100)  // total
      .mockResolvedValueOnce(100); // filtered
    model.findMany.mockResolvedValueOnce([{ name: 'Alice' }]);

    const query: TrellisServerQuery = { page: 1, pageSize: 10 };
    const result = await trellisPrismaQuery(model as any, query);

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
    await trellisPrismaQuery(model as any, query);

    expect(model.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: 'asc' },
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
      searchableColumns: ['name', 'email'],
    });

    // count 應該被呼叫兩次 — 一次 total，一次 filtered
    expect(model.count).toHaveBeenCalledTimes(2);

    // findMany 應該有 where 條件
    const findManyCall = model.findMany.mock.calls[0][0];
    expect(findManyCall.where).toBeDefined();
    expect(findManyCall.where.OR).toBeDefined();
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
    await trellisPrismaQuery(model as any, query);

    const findManyCall = model.findMany.mock.calls[0][0];
    expect(findManyCall.where.status).toBeDefined();
  });

  it('分頁正確計算 skip', async () => {
    const model = createMockModel();
    model.count.mockResolvedValue(100);
    model.findMany.mockResolvedValue([]);

    const query: TrellisServerQuery = { page: 3, pageSize: 10 };
    await trellisPrismaQuery(model as any, query);

    expect(model.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
  });
});
