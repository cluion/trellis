import type {
    SqlDialect,
    SqlQueryOptions,
    TrellisServerQuery,
    WhereClause,
} from './types';

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
        typeof column !== 'string' ||
        !SAFE_COLUMN_RE.test(column) ||
        !columns.includes(column)
    ) {
        throw new TypeError('Query contains a column that is not allowed.');
    }
}

function sqlOptions(options: SqlQueryOptions): Required<SqlQueryOptions> {
    if (!isRecord(options)) {
        throw new TypeError('SQL options must be an object.');
    }

    const {
        dialect = 'sqlite',
        likeMode = 'literal',
        parameterOffset = 0,
    } = options;

    if (
        dialect !== 'sqlite' &&
        dialect !== 'mysql' &&
        dialect !== 'postgresql'
    ) {
        throw new TypeError('Unsupported SQL dialect.');
    }

    if (likeMode !== 'literal' && likeMode !== 'wildcard') {
        throw new TypeError('Invalid SQL likeMode.');
    }

    if (
        typeof parameterOffset !== 'number' ||
        !Number.isSafeInteger(parameterOffset) ||
        parameterOffset < 0 ||
        (dialect !== 'postgresql' && parameterOffset !== 0)
    ) {
        throw new RangeError(
            'parameterOffset must be a non-negative safe integer and is supported only for PostgreSQL.',
        );
    }

    return { dialect, likeMode, parameterOffset };
}

function quotedColumn(
    column: string,
    columns: readonly string[],
    dialect: SqlDialect,
): string {
    allowedColumn(column, columns);
    const quote = dialect === 'postgresql' ? '"' : '`';

    return `${quote}${column}${quote}`;
}

function containsPattern(
    value: string,
    mode: SqlQueryOptions['likeMode'],
): string {
    if (value.includes('\0')) {
        throw new TypeError('SQL LIKE search does not support NUL characters.');
    }

    const escaped = value.replace(
        mode === 'wildcard' ? /!/g : /[!%_]/g,
        (c) => `!${c}`,
    );

    return `%${escaped}%`;
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
    options: SqlQueryOptions = {},
): WhereClause {
    const { dialect, likeMode, parameterOffset } = sqlOptions(options);
    filter = parseTrellisQuery({ filter }).filter;

    if (!filter) {
        return { sql: '', params: [] };
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    const bind = (value: unknown): string => {
        params.push(value);

        if (dialect === 'postgresql') {
            const index = parameterOffset + params.length;

            if (!Number.isSafeInteger(index)) {
                throw new RangeError(
                    'SQL parameter index exceeds the safe integer range.',
                );
            }

            return `$${index}`;
        }

        return '?';
    };

    // 全域搜尋 — 所有欄位 OR
    if (filter.global) {
        if (!Array.isArray(columns) || columns.length === 0) {
            throw new TypeError('Global search requires allowed columns.');
        }

        const orConditions = Array.from(columns, (col) => {
            const name = quotedColumn(col, columns, dialect);

            return `${name} LIKE ${bind(containsPattern(filter.global!, likeMode))} ESCAPE '!'`;
        });

        if (orConditions.length > 0) {
            conditions.push(`(${orConditions.join(' OR ')})`);
        }
    }

    // 單欄篩選 — AND
    if (filter.columns) {
        for (const [colId, value] of Object.entries(filter.columns)) {
            const name = quotedColumn(colId, columns, dialect);

            if (value == null || value === '') {
                continue;
            }

            if (typeof value === 'string') {
                conditions.push(
                    `${name} LIKE ${bind(containsPattern(value, likeMode))} ESCAPE '!'`,
                );
            } else {
                conditions.push(`${name} = ${bind(value)}`);
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
    options: SqlQueryOptions = {},
): string {
    const { dialect } = sqlOptions(options);
    sort = parseTrellisQuery({ sort }).sort;

    if (!sort || sort.length === 0) {
        return '';
    }

    const clauses = sort.map((s) => {
        const name = quotedColumn(s.columnId, columns ?? [], dialect);

        return `${name} ${s.direction === 'desc' ? 'DESC' : 'ASC'}`;
    });

    return clauses.length > 0 ? `ORDER BY ${clauses.join(', ')}` : '';
}
