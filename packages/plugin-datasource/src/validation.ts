import type { TrellisQuery, TrellisResponse } from './types';

export function validateQuery(query: TrellisQuery): void {
    if (
        !Number.isSafeInteger(query.page) ||
        query.page < 1 ||
        !Number.isSafeInteger(query.pageSize) ||
        query.pageSize < 1 ||
        !Number.isSafeInteger((query.page - 1) * query.pageSize)
    ) {
        throw new RangeError(
            'Trellis query page and pageSize must be positive safe integers with a safe offset',
        );
    }
}

export function validateResponse<T>(
    value: unknown,
    query: TrellisQuery,
): asserts value is TrellisResponse<T> {
    if (!value || typeof value !== 'object') {
        throw new TypeError('Invalid TrellisResponse: expected an object');
    }

    const { data, total, filtered } = value as TrellisResponse<T>;

    if (!Array.isArray(data)) {
        throw new TypeError(
            'Invalid TrellisResponse.data: expected an array of row objects',
        );
    }

    for (const row of data) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            throw new TypeError(
                'Invalid TrellisResponse.data: expected an array of row objects',
            );
        }
    }

    if (
        !Number.isSafeInteger(total) ||
        total < 0 ||
        !Number.isSafeInteger(filtered) ||
        filtered < 0 ||
        filtered > total
    ) {
        throw new TypeError(
            'Invalid TrellisResponse counts: expected 0 <= filtered <= total as safe integers',
        );
    }

    const expected = Math.min(
        query.pageSize,
        Math.max(0, filtered - (query.page - 1) * query.pageSize),
    );

    if (data.length !== expected) {
        throw new TypeError(
            `Invalid TrellisResponse.data length: expected ${expected}, received ${data.length}`,
        );
    }
}
