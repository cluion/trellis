import type { TrellisServerQuery, WhereClause } from './types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 1000;
const SAFE_COLUMN_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseInteger(value: unknown, fallback: number, name: string): number {
    if (value == null || value === '') {
        return fallback;
    }

    if (
        (typeof value !== 'number' && typeof value !== 'string') ||
        (typeof value === 'string' && value.trim() === '') ||
        !Number.isSafeInteger(Number(value))
    ) {
        throw new TypeError(`${name} must be a safe integer.`);
    }

    return Number(value) || fallback;
}

function parseJSON(value: unknown, name: string): unknown {
    if (typeof value !== 'string') {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        throw new TypeError(`${name} must contain valid JSON.`);
    }
}

function allowedColumn(column: string, columns: readonly string[]): void {
    if (
        !Array.isArray(columns) ||
        !SAFE_COLUMN_RE.test(column) ||
        !columns.includes(column)
    ) {
        throw new TypeError('Query contains a column that is not allowed.');
    }
}

/**
 * 從 HTTP 請求參數解析 Trellis 查詢。
 * 支援 JSON body 和 URL query string 兩種格式。
 */
export function parseTrellisQuery(
    raw: Record<string, unknown>,
): TrellisServerQuery {
    if (!isRecord(raw)) {
        throw new TypeError('Query must be an object.');
    }

    const page = Math.max(
        DEFAULT_PAGE,
        parseInteger(raw.page, DEFAULT_PAGE, 'page'),
    );
    const pageSize = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInteger(raw.pageSize, DEFAULT_PAGE_SIZE, 'pageSize')),
    );

    if (!Number.isSafeInteger((page - 1) * pageSize)) {
        throw new RangeError(
            'Pagination offset exceeds the safe integer range.',
        );
    }

    let sort: TrellisServerQuery['sort'];
    let filter: TrellisServerQuery['filter'];

    // 解析 sort — 可能是 JSON 字串或物件
    if (raw.sort != null) {
        const parsed = parseJSON(raw.sort, 'sort');

        if (!Array.isArray(parsed)) {
            throw new TypeError('sort must be an array.');
        }

        sort = Array.from(parsed, (s: unknown) => {
            if (
                !isRecord(s) ||
                typeof s.columnId !== 'string' ||
                s.columnId.length === 0 ||
                (s.direction !== 'asc' && s.direction !== 'desc')
            ) {
                throw new TypeError('sort contains an invalid criterion.');
            }

            return { columnId: s.columnId, direction: s.direction };
        });
    }

    // 解析 filter — 可能是 JSON 字串或物件
    if (raw.filter != null) {
        const parsed = parseJSON(raw.filter, 'filter');

        if (!isRecord(parsed)) {
            throw new TypeError('filter must be an object.');
        }

        if (parsed.global !== undefined && typeof parsed.global !== 'string') {
            throw new TypeError('filter.global must be a string.');
        }

        if (parsed.columns !== undefined && !isRecord(parsed.columns)) {
            throw new TypeError('filter.columns must be an object.');
        }

        const entries = Object.entries(parsed.columns ?? {});

        for (const [column, value] of entries) {
            if (
                !column ||
                (value != null &&
                    typeof value !== 'string' &&
                    typeof value !== 'boolean' &&
                    !(typeof value === 'number' && Number.isFinite(value)))
            ) {
                throw new TypeError(
                    'filter.columns contains an invalid value.',
                );
            }
        }

        filter = {
            ...(parsed.global === undefined ? {} : { global: parsed.global }),
            ...(parsed.columns === undefined
                ? {}
                : { columns: Object.fromEntries(entries) }),
        };
    }

    return { page, pageSize, sort, filter };
}

/**
 * 建構 SQL WHERE 子句。
 * 全域搜尋 → 跨欄 OR；單欄篩選 → AND。
 */
export function buildWhereClause(
    columns: readonly string[],
    filter?: TrellisServerQuery['filter'],
): WhereClause {
    filter = parseTrellisQuery({ filter }).filter;

    if (!filter) {
        return { sql: '', params: [] };
    }

    const conditions: string[] = [];
    const params: unknown[] = [];

    // 全域搜尋 — 所有欄位 OR
    if (filter.global) {
        if (columns.length === 0) {
            throw new TypeError('Global search requires allowed columns.');
        }

        const orConditions = columns.map((col) => {
            allowedColumn(col, columns);
            params.push(`%${filter.global}%`);

            return `${col} LIKE ?`;
        });

        if (orConditions.length > 0) {
            conditions.push(`(${orConditions.join(' OR ')})`);
        }
    }

    // 單欄篩選 — AND
    if (filter.columns) {
        for (const [colId, value] of Object.entries(filter.columns)) {
            allowedColumn(colId, columns);

            if (value == null || value === '') {
                continue;
            }

            if (typeof value === 'string') {
                conditions.push(`${colId} LIKE ?`);
                params.push(`%${value}%`);
            } else {
                conditions.push(`${colId} = ?`);
                params.push(value);
            }
        }
    }

    return {
        sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params,
    };
}

/**
 * 建構 SQL ORDER BY 子句。
 * 過濾不安全的欄位名稱防止 SQL injection。
 */
export function buildOrderByClause(
    sort: TrellisServerQuery['sort'],
    columns: readonly string[],
): string {
    sort = parseTrellisQuery({ sort }).sort;

    if (!sort || sort.length === 0) {
        return '';
    }

    const clauses = sort.map((s) => {
        allowedColumn(s.columnId, columns ?? []);

        return `${s.columnId} ${s.direction === 'desc' ? 'DESC' : 'ASC'}`;
    });

    return clauses.length > 0 ? `ORDER BY ${clauses.join(', ')}` : '';
}
