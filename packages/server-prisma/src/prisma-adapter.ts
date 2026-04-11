import type { TrellisServerQuery } from '@trellisjs/server';

interface PrismaModel {
  count(args?: any): Promise<number>;
  findMany(args?: any): Promise<any[]>;
}

interface PrismaAdapterOptions {
  /** 可被全域搜尋的欄位名稱 */
  searchableColumns?: string[];
  /** 欄位名稱對應到 Prisma 欄位名稱（如果有差異） */
  columnMap?: Record<string, string>;
}

/**
 * 一行搞定 Trellis 查詢 → Prisma ORM 操作。
 */
export async function trellisPrismaQuery<T>(
  model: PrismaModel,
  query: TrellisServerQuery,
  options?: PrismaAdapterOptions,
): Promise<{
  data: T[];
  total: number;
  filtered: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { searchableColumns = [], columnMap = {} } = options ?? {};

  const resolveCol = (colId: string) => columnMap[colId] ?? colId;

  // 建構 where 條件
  const where: Record<string, any> = {};

  if (query.filter?.global && searchableColumns.length > 0) {
    where.OR = searchableColumns.map((col) => ({
      [resolveCol(col)]: { contains: query.filter!.global, mode: 'insensitive' },
    }));
  }

  if (query.filter?.columns) {
    for (const [colId, value] of Object.entries(query.filter.columns)) {
      if (value == null || value === '') continue;
      const prismaCol = resolveCol(colId);
      if (typeof value === 'string') {
        where[prismaCol] = { contains: value, mode: 'insensitive' };
      } else {
        where[prismaCol] = { equals: value };
      }
    }
  }

  // 建構 orderBy
  const orderBy: Record<string, string> = {};
  if (query.sort) {
    for (const s of query.sort) {
      orderBy[resolveCol(s.columnId)] = s.direction;
    }
  }

  // 計算筆數
  const total = await model.count();
  const filtered = Object.keys(where).length > 0
    ? await model.count({ where })
    : total;

  // 取得資料
  const skip = (query.page - 1) * query.pageSize;
  const data = await model.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
    skip,
    take: query.pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(filtered / query.pageSize));

  return {
    data: data as T[],
    total,
    filtered,
    page: query.page,
    pageSize: query.pageSize,
    totalPages,
  };
}
