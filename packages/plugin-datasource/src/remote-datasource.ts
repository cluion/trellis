import type {
    TrellisDatasource,
    TrellisQuery,
    TrellisResponse,
    RemoteDatasourceOptions,
    DatasourceFetchContext,
} from './types';
import { validateQuery, validateResponse } from './validation';

function buildGetUrl(url: string, query: unknown): string {
    if (!query || typeof query !== 'object' || Array.isArray(query)) {
        throw new TypeError('Trellis GET transformQuery must return an object');
    }

    const hashIndex = url.indexOf('#');
    const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
    const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
    const queryIndex = base.indexOf('?');
    const path = queryIndex === -1 ? base : base.slice(0, queryIndex);
    const params = new URLSearchParams(
        queryIndex === -1 ? '' : base.slice(queryIndex + 1),
    );

    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
            params.set(
                key,
                value !== null && typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value),
            );
        }
    }

    return `${path}?${params.toString()}${hash}`;
}

/**
 * 建立遠端 API 資料源。
 * 透過 fetch 向後端發送標準化查詢，並解析回應。
 */
export function createRemoteDatasource<T = Record<string, unknown>>(
    options: RemoteDatasourceOptions<T>,
): TrellisDatasource<T> {
    const {
        url,
        method = 'POST',
        headers = {},
        transformQuery,
        transformResponse,
    } = options;

    return {
        async fetch(
            query: TrellisQuery,
            context?: DatasourceFetchContext,
        ): Promise<TrellisResponse<T>> {
            validateQuery(query);
            const finalQuery = transformQuery ? transformQuery(query) : query;

            let response: Response;

            if (method === 'GET') {
                response = await fetch(buildGetUrl(url, finalQuery), {
                    method: 'GET',
                    headers: { Accept: 'application/json', ...headers },
                    signal: context?.signal,
                });
            } else {
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        ...headers,
                    },
                    body: JSON.stringify(finalQuery),
                    signal: context?.signal,
                });
            }

            if (!response.ok) {
                throw new Error(
                    `Trellis datasource request failed: ${response.status}`,
                );
            }

            const raw = await response.json();

            const result = transformResponse ? transformResponse(raw) : raw;
            validateResponse<T>(result, query);

            return result;
        },
    };
}
