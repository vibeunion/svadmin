import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { CustomParams, CustomResult, DataProvider, Filter } from '@svadmin/core';
import { createDirectusDataProvider } from './data-provider';

const originalFetch = globalThis.fetch;
let mockFetchFn: ReturnType<typeof mock>;

function setupMockFetch(response: unknown, status = 200, statusText = 'OK'): void {
  const body = response === undefined ? '' : JSON.stringify(response);
  mockFetchFn = mock(() => Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(),
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(body),
  } as unknown as Response));
  globalThis.fetch = mockFetchFn as unknown as typeof fetch;
}

function requiredSearchParam(params: URLSearchParams, name: string): string {
  const value = params.get(name);
  if (value === null) throw new Error(`Missing expected search parameter: ${name}`);
  return value;
}

function customRequest(
  provider: DataProvider,
  params: CustomParams,
): Promise<CustomResult> {
  if (!provider.custom) throw new Error('Directus provider custom() is unavailable');
  return provider.custom(params);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('createDirectusDataProvider', () => {
  let provider: DataProvider;

  beforeEach(() => {
    provider = createDirectusDataProvider('https://directus.example.com', 'provider-token');
  });

  it('maps every svadmin filter operator to its Directus equivalent', async () => {
    setupMockFetch({ data: [], meta: { total_count: 0 } });
    const filters: Filter[] = [
      { field: 'eq', operator: 'eq', value: 0 },
      { field: 'ne', operator: 'ne', value: false },
      { field: 'lt', operator: 'lt', value: 1 },
      { field: 'gt', operator: 'gt', value: 2 },
      { field: 'lte', operator: 'lte', value: 3 },
      { field: 'gte', operator: 'gte', value: 4 },
      { field: 'contains', operator: 'contains', value: '' },
      { field: 'ncontains', operator: 'ncontains', value: 'draft' },
      { field: 'startswith', operator: 'startswith', value: 'A' },
      { field: 'endswith', operator: 'endswith', value: 'Z' },
      { field: 'in', operator: 'in', value: [1, 2] },
      { field: 'nin', operator: 'nin', value: ['x', 'y'] },
      { field: 'null', operator: 'null', value: null },
      { field: 'nnull', operator: 'nnull', value: null },
      { field: 'between', operator: 'between', value: [10, 20] },
      { field: 'nbetween', operator: 'nbetween', value: [30, 40] },
    ];

    await provider.getList({ resource: 'posts', filters });

    const [rawUrl] = mockFetchFn.mock.calls[0] as [string, RequestInit];
    const filter = JSON.parse(requiredSearchParam(new URL(rawUrl).searchParams, 'filter'));
    expect(filter).toEqual({
      _and: [
        { eq: { _eq: 0 } },
        { ne: { _neq: false } },
        { lt: { _lt: 1 } },
        { gt: { _gt: 2 } },
        { lte: { _lte: 3 } },
        { gte: { _gte: 4 } },
        { contains: { _contains: '' } },
        { ncontains: { _ncontains: 'draft' } },
        { startswith: { _starts_with: 'A' } },
        { endswith: { _ends_with: 'Z' } },
        { in: { _in: [1, 2] } },
        { nin: { _nin: ['x', 'y'] } },
        { null: { _null: true } },
        { nnull: { _nnull: true } },
        { between: { _between: [10, 20] } },
        { nbetween: { _nbetween: [30, 40] } },
      ],
    });
  });

  it('preserves nested and/or filter groups', async () => {
    setupMockFetch({ data: [], meta: { total_count: 0 } });
    const filters: Filter[] = [{
      operator: 'or',
      value: [
        { field: 'status', operator: 'eq', value: 'active' },
        {
          operator: 'and',
          value: [
            { field: 'score', operator: 'gte', value: 10 },
            { field: 'score', operator: 'lte', value: 20 },
          ],
        },
      ],
    }];

    await provider.getList({ resource: 'posts', filters });

    const [rawUrl] = mockFetchFn.mock.calls[0] as [string, RequestInit];
    const filter = JSON.parse(requiredSearchParam(new URL(rawUrl).searchParams, 'filter'));
    expect(filter).toEqual({
      _or: [
        { status: { _eq: 'active' } },
        {
          _and: [
            { score: { _gte: 10 } },
            { score: { _lte: 20 } },
          ],
        },
      ],
    });
  });

  it('rejects unsupported runtime filter operators instead of falling back to equality', async () => {
    setupMockFetch({ data: [], meta: { total_count: 0 } });
    const unsupported = {
      field: 'name',
      operator: 'regex',
      value: '^A',
    } as unknown as Filter;

    await expect(provider.getList({
      resource: 'posts',
      filters: [unsupported],
    })).rejects.toThrow('Unsupported Directus filter operator: regex');
    expect(mockFetchFn).not.toHaveBeenCalled();
  });

  it('applies custom query, sorters, filters, provider headers, and falsy payloads', async () => {
    setupMockFetch({ data: { ok: true } });
    const filters: Filter[] = [{
      operator: 'or',
      value: [
        { field: 'status', operator: 'eq', value: 'active' },
        { field: 'score', operator: 'gte', value: 10 },
      ],
    }];

    await customRequest(provider, {
      url: 'https://directus.example.com/server/report?existing=yes',
      method: 'post',
      payload: false,
      query: {
        page: 0,
        enabled: false,
        search: '',
        nullable: null,
        tags: ['one', 'two'],
      },
      sorters: [
        { field: 'created_at', order: 'desc' },
        { field: 'name', order: 'asc' },
      ],
      filters,
    });

    const [rawUrl, init] = mockFetchFn.mock.calls[0] as [string, RequestInit];
    const params = new URL(rawUrl).searchParams;
    expect(params.get('existing')).toBe('yes');
    expect(params.get('page')).toBe('0');
    expect(params.get('enabled')).toBe('false');
    expect(params.get('search')).toBe('');
    expect(params.get('nullable')).toBe('null');
    expect(params.getAll('tags')).toEqual(['one', 'two']);
    expect(params.get('sort')).toBe('-created_at,name');
    expect(JSON.parse(requiredSearchParam(params, 'filter'))).toEqual({
      _or: [
        { status: { _eq: 'active' } },
        { score: { _gte: 10 } },
      ],
    });
    expect(init.body).toBe('false');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer provider-token');
  });

  for (const [name, payload, expectedBody] of [
    ['zero', 0, '0'],
    ['empty string', '', '""'],
    ['null', null, 'null'],
  ] as const) {
    it(`preserves a ${name} custom payload`, async () => {
      setupMockFetch({ data: { ok: true } });

      await customRequest(provider, {
        url: 'https://directus.example.com/echo',
        method: 'post',
        payload,
      });

      const [, init] = mockFetchFn.mock.calls[0] as [string, RequestInit];
      expect(init.body).toBe(expectedBody);
    });
  }

  it('strips the provider token from cross-origin custom requests', async () => {
    setupMockFetch({ ok: true });

    await customRequest(provider, {
      url: 'https://analytics.example.net/report',
      method: 'get',
      headers: { 'X-Request-ID': 'request-1' },
    });

    const [, init] = mockFetchFn.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Request-ID']).toBe('request-1');
  });

  it('allows an explicit cross-origin authorization header', async () => {
    setupMockFetch({ ok: true });

    await customRequest(provider, {
      url: 'https://analytics.example.net/report',
      method: 'get',
      headers: { Authorization: 'Bearer analytics-token' },
    });

    const [, init] = mockFetchFn.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer analytics-token');
  });

  it('does not call json() for a 204 response', async () => {
    const json = mock(() => Promise.reject(new Error('json() must not be called')));
    const text = mock(() => Promise.resolve(''));
    mockFetchFn = mock(() => Promise.resolve({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: new Headers(),
      json,
      text,
    } as unknown as Response));
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    const result = await customRequest(provider, {
      url: 'https://directus.example.com/empty',
      method: 'delete',
    });

    expect(result.data).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });

  it('does not call json() for a 205 response', async () => {
    const json = mock(() => Promise.reject(new Error('json() must not be called')));
    const text = mock(() => Promise.resolve(''));
    mockFetchFn = mock(() => Promise.resolve({
      ok: true,
      status: 205,
      statusText: 'Reset Content',
      headers: new Headers(),
      json,
      text,
    } as unknown as Response));
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    const result = await customRequest(provider, {
      url: 'https://directus.example.com/empty',
      method: 'post',
    });

    expect(result.data).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });

  it('does not consume the body when Content-Length is zero', async () => {
    const json = mock(() => Promise.reject(new Error('json() must not be called')));
    const text = mock(() => Promise.reject(new Error('text() must not be called')));
    mockFetchFn = mock(() => Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Length': '0' }),
      json,
      text,
    } as unknown as Response));
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    const result = await customRequest(provider, {
      url: 'https://directus.example.com/empty',
      method: 'get',
    });

    expect(result.data).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });

  it('does not call json() when a successful response body is actually empty', async () => {
    const json = mock(() => Promise.reject(new Error('json() must not be called')));
    const text = mock(() => Promise.resolve(''));
    mockFetchFn = mock(() => Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json,
      text,
    } as unknown as Response));
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;

    const result = await customRequest(provider, {
      url: 'https://directus.example.com/empty',
      method: 'get',
    });

    expect(result.data).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(text).toHaveBeenCalledTimes(1);
  });

  it('returns the deleted id when Directus responds with 204', async () => {
    setupMockFetch(undefined, 204, 'No Content');

    const result = await provider.deleteOne({ resource: 'posts', id: 42 });

    expect(result.data).toEqual({ id: 42 });
  });
});
