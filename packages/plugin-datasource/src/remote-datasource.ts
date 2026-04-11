import type {
  TrellisDatasource,
  TrellisQuery,
  TrellisResponse,
  RemoteDatasourceOptions,
} from './types';

/**
 * 建立遠端 API 資料源。
 * 透過 fetch 向後端發送標準化查詢，並解析回應。
 */
export function createRemoteDatasource<T = Record<string, unknown>>(
  options: RemoteDatasourceOptions,
): TrellisDatasource<T> {
  const {
    url,
    method = 'POST',
    headers = {},
    transformQuery,
    transformResponse,
  } = options;

  return {
    async fetch(query: TrellisQuery): Promise<TrellisResponse<T>> {
      const finalQuery = transformQuery ? transformQuery(query) : query;

      let response: Response;

      if (method === 'GET') {
        const params = new URLSearchParams();
        params.set('page', String(query.page));
        params.set('pageSize', String(query.pageSize));
        if (query.sort) params.set('sort', JSON.stringify(query.sort));
        if (query.filter) params.set('filter', JSON.stringify(query.filter));

        response = await fetch(`${url}?${params.toString()}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json', ...headers },
        });
      } else {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...headers,
          },
          body: JSON.stringify(finalQuery),
        });
      }

      if (!response.ok) {
        throw new Error(
          `Trellis datasource request failed: ${response.status}`,
        );
      }

      const raw = await response.json();
      return transformResponse
        ? (transformResponse(raw) as TrellisResponse<T>)
        : (raw as TrellisResponse<T>);
    },
  };
}
