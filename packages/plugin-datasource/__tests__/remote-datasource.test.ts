import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRemoteDatasource } from '../src/remote-datasource';
import type { TrellisResponse } from '../src/types';

// 使用 fetch mock
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function mockResponse(body: TrellisResponse, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('遠端資料源', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('向指定 URL 發送 POST 請求', async () => {
    mockFetch.mockReturnValue(
      mockResponse({ data: [], total: 0, filtered: 0 }),
    );

    const ds = createRemoteDatasource({ url: '/api/users' });
    await ds.fetch({ page: 1, pageSize: 10 });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/users');
    expect(init.method).toBe('POST');
  });

  it('將查詢參數序列化為 JSON body', async () => {
    mockFetch.mockReturnValue(
      mockResponse({ data: [], total: 0, filtered: 0 }),
    );

    const ds = createRemoteDatasource({ url: '/api/users' });
    await ds.fetch({
      page: 2,
      pageSize: 25,
      sort: [{ columnId: 'name', direction: 'asc' }],
      filter: { global: 'alice' },
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(25);
    expect(body.sort).toEqual([{ columnId: 'name', direction: 'asc' }]);
    expect(body.filter).toEqual({ global: 'alice' });
  });

  it('解析後端回傳的 TrellisResponse', async () => {
    const serverResponse: TrellisResponse = {
      data: [{ name: 'Alice', age: 30 }],
      total: 100,
      filtered: 1,
    };
    mockFetch.mockReturnValue(mockResponse(serverResponse));

    const ds = createRemoteDatasource({ url: '/api/users' });
    const result = await ds.fetch({ page: 1, pageSize: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(100);
    expect(result.filtered).toBe(1);
  });

  it('支援 GET 方法（查詢參數放在 URL）', async () => {
    mockFetch.mockReturnValue(
      mockResponse({ data: [], total: 0, filtered: 0 }),
    );

    const ds = createRemoteDatasource({ url: '/api/users', method: 'GET' });
    await ds.fetch({ page: 3, pageSize: 10 });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('page=3');
    expect(calledUrl).toContain('pageSize=10');
  });

  it('支援自訂請求標頭', async () => {
    mockFetch.mockReturnValue(
      mockResponse({ data: [], total: 0, filtered: 0 }),
    );

    const ds = createRemoteDatasource({
      url: '/api/users',
      headers: { Authorization: 'Bearer token123' },
    });
    await ds.fetch({ page: 1, pageSize: 10 });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer token123');
  });

  it('支援 transformQuery 自訂查詢格式', async () => {
    mockFetch.mockReturnValue(
      mockResponse({ data: [], total: 0, filtered: 0 }),
    );

    const ds = createRemoteDatasource({
      url: '/api/users',
      transformQuery: (query) => ({
        offset: (query.page - 1) * query.pageSize,
        limit: query.pageSize,
        orderby: query.sort?.[0]?.columnId,
        dir: query.sort?.[0]?.direction,
      }),
    });
    await ds.fetch({ page: 2, pageSize: 10 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.offset).toBe(10);
    expect(body.limit).toBe(10);
    expect(body.orderby).toBeUndefined();
  });

  it('支援 transformResponse 自訂回應格式', async () => {
    mockFetch.mockReturnValue(
      mockResponse({
        rows: [{ name: 'Alice' }],
        total_count: 50,
        filtered_count: 1,
      }),
    );

    const ds = createRemoteDatasource({
      url: '/api/users',
      transformResponse: (res: any) => ({
        data: res.rows,
        total: res.total_count,
        filtered: res.filtered_count,
      }),
    });
    const result = await ds.fetch({ page: 1, pageSize: 10 });

    expect(result.data).toEqual([{ name: 'Alice' }]);
    expect(result.total).toBe(50);
  });

  it('HTTP 錯誤時拋出例外', async () => {
    mockFetch.mockReturnValue(
      mockResponse({ error: 'Internal Server Error' }, 500),
    );

    const ds = createRemoteDatasource({ url: '/api/users' });

    await expect(
      ds.fetch({ page: 1, pageSize: 10 }),
    ).rejects.toThrow(/500/);
  });

  it('網路錯誤時拋出例外', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const ds = createRemoteDatasource({ url: '/api/users' });

    await expect(
      ds.fetch({ page: 1, pageSize: 10 }),
    ).rejects.toThrow('Network error');
  });
});
