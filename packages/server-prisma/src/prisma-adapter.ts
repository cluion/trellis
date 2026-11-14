import { parseTrellisQuery } from '@trellisjs/server';
import type { TrellisServerQuery } from '@trellisjs/server';

interface PrismaModel {
    count(args?: any): Promise<number>;
    findMany(args?: any): Promise<any[]>;
}

export class PrismaConsistencyError extends Error {
    constructor() {
        super(
            'Prisma query returned inconsistent counts or rows. Run the query inside withPrismaSnapshot().',
        );
        this.name = 'PrismaConsistencyError';
    }
}

export interface PrismaAdapterOptions {
    /** Explicit scalar fields returned by findMany. */
    select: Record<string, boolean>;
    searchableColumns?: readonly string[];
    filterableColumns?: readonly string[];
    sortableColumns?: readonly string[];
    columnMap?: Record<string, string>;
    /** Defaults to database collation; insensitive is opt-in for PostgreSQL/MongoDB. */
    stringFilterMode?: 'default' | 'insensitive';
}

const FIELD_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const RESERVED_FIELDS = new Set([
    'AND',
    'OR',
    'NOT',
    '__proto__',
    'constructor',
    'prototype',
]);

function validateField(field: string): void {
    if (
        typeof field !== 'string' ||
        !FIELD_RE.test(field) ||
        RESERVED_FIELDS.has(field)
    ) {
        throw new TypeError('Prisma configuration contains an invalid field.');
    }
}

/** Convert a validated query using explicit result and query-field permissions. */
export async function trellisPrismaQuery<T>(
    model: PrismaModel,
    query: TrellisServerQuery,
    options: PrismaAdapterOptions,
): Promise<{
    data: T[];
    total: number;
    filtered: number;
    page: number;
    pageSize: number;
    totalPages: number;
}> {
    if (
        !options?.select ||
        typeof options.select !== 'object' ||
        Array.isArray(options.select)
    ) {
        throw new TypeError(
            'Prisma queries require an explicit select configuration.',
        );
    }

    const selected = Object.entries(options.select);

    if (!selected.some(([, value]) => value === true)) {
        throw new TypeError('Prisma select must include at least one field.');
    }

    for (const [field, value] of selected) {
        validateField(field);

        if (typeof value !== 'boolean') {
            throw new TypeError(
                'Prisma select supports scalar boolean fields only.',
            );
        }
    }

    const parsed = parseTrellisQuery({ ...query });

    if (parsed.page !== query.page || parsed.pageSize !== query.pageSize) {
        throw new TypeError(
            'Prisma pagination requires positive integers and pageSize <= 1000.',
        );
    }

    const {
        searchableColumns = [],
        filterableColumns = [],
        sortableColumns = [],
        columnMap = {},
        stringFilterMode = 'default',
    } = options;

    if (stringFilterMode !== 'default' && stringFilterMode !== 'insensitive') {
        throw new TypeError('Invalid Prisma stringFilterMode.');
    }

    const resolveCol = (id: string): string => {
        const field = Object.prototype.hasOwnProperty.call(columnMap, id)
            ? columnMap[id]
            : id;
        validateField(field);

        return field;
    };
    const allow = (id: string, allowed: readonly string[]): string => {
        if (!Array.isArray(allowed) || !allowed.includes(id)) {
            throw new TypeError('Query contains a column that is not allowed.');
        }

        return resolveCol(id);
    };
    const contains = (value: string) => ({
        contains: value,
        ...(stringFilterMode === 'insensitive' ? { mode: 'insensitive' } : {}),
    });
    const conditions: Record<string, unknown>[] = [];

    if (parsed.filter?.global) {
        if (
            !Array.isArray(searchableColumns) ||
            searchableColumns.length === 0
        ) {
            throw new TypeError('Global search requires searchableColumns.');
        }

        conditions.push({
            OR: searchableColumns.map((id) => ({
                [resolveCol(id)]: contains(parsed.filter!.global!),
            })),
        });
    }

    for (const [id, value] of Object.entries(parsed.filter?.columns ?? {})) {
        const field = allow(id, filterableColumns);

        if (value != null && value !== '') {
            conditions.push({
                [field]:
                    typeof value === 'string'
                        ? contains(value)
                        : { equals: value },
            });
        }
    }

    const orderBy = parsed.sort?.map((s) => ({
        [allow(s.columnId, sortableColumns)]: s.direction,
    }));
    const where = conditions.length > 0 ? { AND: conditions } : undefined;
    const total = await model.count();
    const filtered = where ? await model.count({ where }) : total;
    const data = await model.findMany({
        select: { ...options.select },
        where,
        orderBy: orderBy?.length ? orderBy : undefined,
        skip: (parsed.page - 1) * parsed.pageSize,
        take: parsed.pageSize,
    });

    if (
        !Number.isSafeInteger(total) ||
        total < 0 ||
        !Number.isSafeInteger(filtered) ||
        filtered < 0 ||
        filtered > total ||
        !Array.isArray(data) ||
        data.length !==
            Math.min(
                parsed.pageSize,
                Math.max(0, filtered - (parsed.page - 1) * parsed.pageSize),
            )
    ) {
        throw new PrismaConsistencyError();
    }

    return {
        data: data as T[],
        total,
        filtered,
        page: parsed.page,
        pageSize: parsed.pageSize,
        totalPages: Math.max(1, Math.ceil(filtered / parsed.pageSize)),
    };
}
