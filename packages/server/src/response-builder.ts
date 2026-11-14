import type { TrellisServerQuery } from './types';

/**
 * 標準回應建構器。
 * 後端用這個函式產生符合 Trellis 協定的回應。
 */
export function buildResponse<T>(
    data: T[],
    options: {
        total: number;
        filtered: number;
        query: TrellisServerQuery;
    },
): {
    data: T[];
    total: number;
    filtered: number;
    page: number;
    pageSize: number;
    totalPages: number;
} {
    if (
        !options ||
        typeof options !== 'object' ||
        Array.isArray(options) ||
        !options.query ||
        typeof options.query !== 'object' ||
        Array.isArray(options.query)
    ) {
        throw new TypeError('Response options must be an object with a query.');
    }

    const { total, filtered, query } = options;
    const { page, pageSize } = query;

    if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(pageSize) ||
        pageSize < 1 ||
        !Number.isSafeInteger((page - 1) * pageSize)
    ) {
        throw new RangeError(
            'Response page and pageSize must be positive safe integers with a safe offset.',
        );
    }

    if (
        !Number.isSafeInteger(total) ||
        total < 0 ||
        !Number.isSafeInteger(filtered) ||
        filtered < 0 ||
        filtered > total
    ) {
        throw new TypeError(
            'Invalid response counts: expected 0 <= filtered <= total as safe integers.',
        );
    }

    if (!Array.isArray(data)) {
        throw new TypeError(
            'Invalid response data: expected an array of row objects.',
        );
    }

    for (const row of data) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            throw new TypeError(
                'Invalid response data: expected an array of row objects.',
            );
        }
    }

    const expected = Math.min(
        pageSize,
        Math.max(0, filtered - (page - 1) * pageSize),
    );

    if (data.length !== expected) {
        throw new TypeError(
            `Invalid response data length: expected ${expected}, received ${data.length}.`,
        );
    }

    const totalPages = Math.max(1, Math.ceil(filtered / pageSize));

    return {
        data,
        total,
        filtered,
        page,
        pageSize,
        totalPages,
    };
}
