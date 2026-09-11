// Tests for enhanced Elysia DataProvider
import { describe, it, expect, beforeEach, mock, afterEach, type Mock } from 'bun:test';
import { createElysiaDataProvider } from './data-provider';
import type { DataProvider, Filter } from '@svadmin/core';
import { decodeBaseRecord } from '@svadmin/core/schema';
import { requireValue } from '../../../scripts/test-assertions';

// ─── Mock fetch ──────────────────────────────────────────────

const originalFetch = globalThis.fetch;
type FetchRequest = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
let mockFetchFn: Mock<FetchRequest>;

function setupResponse(factory: () => Response) {
  mockFetchFn = mock((_input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(factory()));
  globalThis.fetch = Object.assign(mockFetchFn, { preconnect: () => {} });
}

function capturedRequest(call: Parameters<FetchRequest> | undefined): [string, RequestInit] {
  const [input, init] = requireValue(call);
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return [url, requireValue(init)];
}

function setupMockFetch(response: unknown, status = 200, statusText = 'OK') {
  setupResponse(() => Response.json(response, { status, statusText }));
}

function setupNoContentFetch(status = 204) {
  setupResponse(() => new Response(null, {
    status,
    statusText: status === 205 ? 'Reset Content' : 'No Content',
  }));
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ─── Basic CRUD ──────────────────────────────────────────────

describe('createElysiaDataProvider', () => {
  let provider: DataProvider;

  beforeEach(() => {
    provider = createElysiaDataProvider({ apiUrl: 'http://localhost:3000' });
  });

  it('should return the API URL', () => {
    expect(provider.getApiUrl()).toBe('http://localhost:3000');
  });

  // ─── getList ───────────────────────────────────────────────

  describe('getList', () => {
    it('should fetch list with { items, total } format', async () => {
      const mockData = { items: [{ id: 1, name: 'Test' }], total: 1 };
      setupMockFetch(mockData);

      const result = await provider.getList({ resource: 'posts' });

      expect(result.data).toEqual([{ id: 1, name: 'Test' }]);
      expect(result.total).toBe(1);
      expect(mockFetchFn).toHaveBeenCalledTimes(1);
      const [url] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(url).toContain('http://localhost:3000/posts?');
      expect(url).toContain('_page=1');
      expect(url).toContain('_limit=10');
    });

    it('should fetch list with { data, total } format', async () => {
      const mockData = { data: [{ id: 1 }, { id: 2 }], total: 42 };
      setupMockFetch(mockData);

      const result = await provider.getList({ resource: 'users' });
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.total).toBe(42);
    });

    it('should preserve custom list response metadata', async () => {
      setupMockFetch({
        items: [{ id: 1 }],
        total: 1,
        nextCursor: 'cursor-2',
        facets: { status: { active: 1 } },
      });

      const result = await provider.getList({ resource: 'users' });

      expect(result).toEqual({
        data: [{ id: 1 }],
        total: 1,
        nextCursor: 'cursor-2',
        facets: { status: { active: 1 } },
      });
    });

    it('should fetch list with raw array format', async () => {
      const mockData = [{ id: 1 }, { id: 2 }, { id: 3 }];
      setupMockFetch(mockData);

      const result = await provider.getList({ resource: 'channels' });
      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(3);
    });

    it('should apply pagination params', async () => {
      setupMockFetch({ items: [], total: 0 });

      await provider.getList({
        resource: 'posts',
        pagination: { current: 3, pageSize: 25 },
      });

      const [url] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(url).toContain('_page=3');
      expect(url).toContain('_limit=25');
    });

    it('should apply sorters', async () => {
      setupMockFetch({ items: [], total: 0 });

      await provider.getList({
        resource: 'posts',
        sorters: [{ field: 'name', order: 'asc' }],
      });

      const [url] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(url).toContain('_sort=name');
      expect(url).toContain('_order=asc');
    });

    it('should apply filters', async () => {
      setupMockFetch({ items: [], total: 0 });

      await provider.getList({
        resource: 'posts',
        filters: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'name', operator: 'contains', value: 'test' },
          { field: 'age', operator: 'gte', value: 18 },
        ],
      });

      const [url] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(url).toContain('status=active');
      expect(url).toContain('name_like=test');
      expect(url).toContain('age_gte=18');
    });

    it('should serialize every filter operator and nested logical groups without losing values', async () => {
      setupMockFetch({ items: [], total: 0 });
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
        {
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
        },
      ];

      await provider.getList({ resource: 'posts', filters });

      const [rawUrl] = capturedRequest(mockFetchFn.mock.calls[0]);
      const params = new URL(rawUrl).searchParams;
      expect(params.get('eq')).toBe('0');
      expect(params.get('ne_ne')).toBe('false');
      expect(params.get('lt_lt')).toBe('1');
      expect(params.get('gt_gt')).toBe('2');
      expect(params.get('lte_lte')).toBe('3');
      expect(params.get('gte_gte')).toBe('4');
      expect(params.get('contains_like')).toBe('');
      expect(params.get('ncontains_ncontains')).toBe('draft');
      expect(params.get('startswith_startswith')).toBe('A');
      expect(params.get('endswith_endswith')).toBe('Z');
      expect(params.get('in_in')).toBe('1,2');
      expect(params.get('nin_nin')).toBe('x,y');
      expect(params.get('null_null')).toBe('true');
      expect(params.get('nnull_nnull')).toBe('true');
      expect(params.get('between_between')).toBe('10,20');
      expect(params.get('nbetween_nbetween')).toBe('30,40');
      expect(JSON.parse(requireValue(params.get('_filters')))).toEqual(filters);
      expect(rawUrl).not.toContain('undefined');
      expect(rawUrl).not.toContain('%5Bobject+Object%5D');
    });
  });

  // ─── getOne ────────────────────────────────────────────────

  describe('getOne', () => {
    it('should fetch a single record', async () => {
      const mockData = { id: 1, name: 'Test' };
      setupMockFetch(mockData);

      const result = await provider.getOne({ resource: 'posts', id: 1 });
      expect(result.data).toEqual(mockData);

      const [url] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(url).toBe('http://localhost:3000/posts/1');
    });

    it('should encode reserved characters and traversal attempts in record id path segments', async () => {
      const unsafeId = '../admin/users?role=owner#details';
      setupMockFetch({ id: unsafeId });

      await provider.getOne({ resource: 'posts', id: unsafeId });

      const [url] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(url).toBe('http://localhost:3000/posts/..%2Fadmin%2Fusers%3Frole%3Downer%23details');
    });
  });

  // ─── create ────────────────────────────────────────────────

  describe('create', () => {
    it('should create a record with POST', async () => {
      const mockData = { id: 1, name: 'New' };
      setupMockFetch(mockData);

      const result = await provider.create({
        resource: 'posts',
        variables: { name: 'New' },
      });

      expect(result.data).toEqual(mockData);
      const [url, init] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(url).toBe('http://localhost:3000/posts');
      expect(init.method).toBe('POST');
      expect(init.body).toBe('{"name":"New"}');
    });
  });

  // ─── update ────────────────────────────────────────────────

  describe('update', () => {
    it('should default to PATCH method', async () => {
      const mockData = { id: 1, name: 'Updated' };
      setupMockFetch(mockData);

      await provider.update({
        resource: 'posts',
        id: 1,
        variables: { name: 'Updated' },
      });

      const [, init] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(init.method).toBe('PATCH');
    });

    it('should encode the record id path segment', async () => {
      setupMockFetch({ id: 'folder/item?draft#top' });

      await provider.update({
        resource: 'posts',
        id: 'folder/item?draft#top',
        variables: { name: 'Updated' },
      });

      const [url] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(url).toBe('http://localhost:3000/posts/folder%2Fitem%3Fdraft%23top');
    });
  });

  // ─── deleteOne ─────────────────────────────────────────────

  describe('deleteOne', () => {
    it('should delete a record', async () => {
      setupMockFetch({ id: 1 });

      const result = await provider.deleteOne({ resource: 'posts', id: 1 });
      expect(result.data).toEqual({ id: 1 });

      const [url, init] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(url).toBe('http://localhost:3000/posts/1');
      expect(init.method).toBe('DELETE');
    });

    it('should preserve the deleted id when the backend returns 204', async () => {
      setupNoContentFetch();

      const result = await provider.deleteOne({ resource: 'posts', id: 42 });

      expect(result.data).toEqual({ id: 42 });
    });

    it('should encode the record id path segment', async () => {
      setupMockFetch({ id: 'folder/item?draft#top' });

      await provider.deleteOne({ resource: 'posts', id: 'folder/item?draft#top' });

      const [url] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(url).toBe('http://localhost:3000/posts/folder%2Fitem%3Fdraft%23top');
    });
  });

  // ─── error handling ────────────────────────────────────────

  describe('error handling', () => {
    it('should throw on non-OK response', async () => {
      setupMockFetch({ error: 'Not found' }, 404, 'Not Found');

      await expect(
        provider.getOne({ resource: 'posts', id: 999 })
      ).rejects.toThrow('HTTP 404');
    });
  });
});

// ─── updateMethod option ─────────────────────────────────────

describe('updateMethod: PUT', () => {
  it('should use PUT for updates when configured', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'http://localhost:3000',
      updateMethod: 'PUT',
    });

    setupMockFetch({ id: 1, name: 'Updated' });

    await provider.update({
      resource: 'channels',
      id: 1,
      variables: { name: 'Updated' },
    });

    const [url, init] = capturedRequest(mockFetchFn.mock.calls[0]);
    expect(url).toBe('http://localhost:3000/channels/1');
    expect(init.method).toBe('PUT');
  });

  it('should use PUT for updateMany when configured', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'http://localhost:3000',
      updateMethod: 'PUT',
    });

    setupMockFetch({ id: 1 });

    await requireValue(provider.updateMany)({
      resource: 'channels',
      ids: [1, 2],
      variables: { status: 'active' },
    });

    for (const call of mockFetchFn.mock.calls) {
      const [, init] = capturedRequest(call);
      expect(init.method).toBe('PUT');
    }
  });
});

// ─── withCredentials option ──────────────────────────────────

describe('withCredentials', () => {
  it('should include credentials when enabled', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'http://localhost:3000',
      withCredentials: true,
    });

    setupMockFetch({ items: [], total: 0 });

    await provider.getList({ resource: 'posts' });

    const [, init] = capturedRequest(mockFetchFn.mock.calls[0]);
    expect(init.credentials).toBe('include');
  });

  it('should not include credentials when disabled', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'http://localhost:3000',
    });

    setupMockFetch({ items: [], total: 0 });

    await provider.getList({ resource: 'posts' });

    const [, init] = capturedRequest(mockFetchFn.mock.calls[0]);
    expect(init.credentials).toBeUndefined();
  });
});

// ─── resourceUrlMap option ───────────────────────────────────

describe('resourceUrlMap', () => {
  it('should map resource names to custom URL segments', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'http://localhost:3000/admin',
      resourceUrlMap: {
        user_groups: 'user-groups',
        rateLimits: 'rate-limits',
      },
    });

    setupMockFetch([{ id: 1 }]);

    await provider.getList({ resource: 'user_groups' });
    const [url1] = capturedRequest(mockFetchFn.mock.calls[0]);
    expect(url1).toContain('http://localhost:3000/admin/user-groups?');

    setupMockFetch({ id: 1 });

    await provider.getOne({ resource: 'rateLimits', id: 1 });
    const [url2] = capturedRequest(mockFetchFn.mock.calls[0]);
    expect(url2).toBe('http://localhost:3000/admin/rate-limits/1');
  });

  it('should use resource name as-is when no mapping exists', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'http://localhost:3000',
      resourceUrlMap: { mapped: 'mapped-url' },
    });

    setupMockFetch({ items: [], total: 0 });

    await provider.getList({ resource: 'unmapped' });
    const [url] = capturedRequest(mockFetchFn.mock.calls[0]);
    expect(url).toContain('http://localhost:3000/unmapped?');
  });
});

// ─── parseListResponse option ────────────────────────────────

describe('parseListResponse', () => {
  it('should use custom parser when provided', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'http://localhost:3000',
      parseListResponse: (json: unknown) => {
        const obj = decodeBaseRecord(json);
        return { data: obj['results'], total: obj['count'] };
      },
    });

    setupMockFetch({ results: [{ id: 1 }], count: 100 });

    const result = await provider.getList({ resource: 'posts' });
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.total).toBe(100);
  });
});

// ─── resourceAdapters option ───────────────────────────────

describe('resourceAdapters', () => {
  it('evaluates a function matcher once and reuses its adapter for the complete list request', async () => {
    let matcherCalls = 0;
    const provider = createElysiaDataProvider({
      apiUrl: 'https://console.example.com',
      resourceAdapters: [
        {
          match: () => ++matcherCalls === 1,
          resourcePath: 'snapshot-records',
          buildListSearchParams: () => new URLSearchParams({ dialect: 'snapshot' }),
          parseListResponse: (json: unknown) => {
            const response = decodeBaseRecord(json);
            return { data: response['rows'], total: response['count'] };
          },
        },
        { match: () => true, resourcePath: 'fallback-records' },
      ],
    });
    setupMockFetch({ rows: [{ id: 1 }], count: 1 });

    const result = await provider.getList({ resource: 'records' });

    expect(matcherCalls).toBe(1);
    expect(mockFetchFn.mock.calls[0]?.[0]).toBe(
      'https://console.example.com/snapshot-records?dialect=snapshot',
    );
    expect(result).toEqual({ data: [{ id: 1 }], total: 1 });
  });

  it('uses the first matching adapter and resets stateful regular expressions', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'https://console.example.com/',
      resourceUrlMap: { 'project-tables': 'mapped-tables' },
      resourceAdapters: [
        { match: /^project-/g, resourcePath: 'adapter-tables' },
        { match: () => true, resourcePath: 'fallback-tables' },
      ],
    });
    setupMockFetch({ id: 1 });

    await provider.getOne({ resource: 'project-tables', id: 1 });
    await provider.getOne({ resource: 'project-tables', id: 2 });

    expect(mockFetchFn.mock.calls.map(([url]) => url)).toEqual([
      'https://console.example.com/adapter-tables/1',
      'https://console.example.com/adapter-tables/2',
    ]);
  });

  it('resolves tenant paths, custom list queries, and response metadata per resource', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'https://console.example.com',
      parseListResponse: () => {
        throw new Error('global parser must not run for an adapted resource');
      },
      resourceAdapters: [
        {
          match: 'project-tables',
          resourcePath: ({ meta }) => {
            const projectRef = String(meta?.['projectRef'] ?? '');
            return `v1/projects/${encodeURIComponent(projectRef)}/database/tables`;
          },
          buildListSearchParams: ({ pagination, meta }) => new URLSearchParams({
            page: String(pagination.current),
            limit: String(pagination.pageSize),
            search: String(meta?.['search'] ?? ''),
          }),
          parseListResponse: (json: unknown) => {
            const response = decodeBaseRecord(json);
            return {
              data: response['rows'],
              total: response['total'],
              nextCursor: response['nextCursor'],
            };
          },
        },
      ],
    });

    setupMockFetch({ rows: [{ table_name: 'orders' }], total: 41, nextCursor: 'cursor-2' });

    const result = await provider.getList({
      resource: 'project-tables',
      pagination: { current: 2, pageSize: 25 },
      meta: { projectRef: 'alpha/beta', search: 'order' },
    });

    const [rawUrl] = capturedRequest(mockFetchFn.mock.calls[0]);
    const url = new URL(rawUrl);
    expect(url.pathname).toBe('/v1/projects/alpha%2Fbeta/database/tables');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2',
      limit: '25',
      search: 'order',
    });
    expect(result).toEqual({
      data: [{ table_name: 'orders' }],
      total: 41,
      nextCursor: 'cursor-2',
    });
  });
});

// ─── headers option ──────────────────────────────────────────

describe('headers', () => {
  it('should support static headers', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'http://localhost:3000',
      headers: { 'Authorization': 'Bearer token123' },
    });

    setupMockFetch({ items: [], total: 0 });

    await provider.getList({ resource: 'posts' });

    const [, init] = capturedRequest(mockFetchFn.mock.calls[0]);
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token123');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('should support dynamic headers function', async () => {
    let token = 'token1';
    const provider = createElysiaDataProvider({
      apiUrl: 'http://localhost:3000',
      headers: () => ({ 'Authorization': `Bearer ${token}` }),
    });

    setupMockFetch({ items: [], total: 0 });

    await provider.getList({ resource: 'posts' });
    let [, init] = capturedRequest(mockFetchFn.mock.calls[0]);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token1');

    // Change token
    token = 'token2';
    setupMockFetch({ items: [], total: 0 });

    await provider.getList({ resource: 'posts' });
    [, init] = capturedRequest(mockFetchFn.mock.calls[0]);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token2');
  });
});

// ─── custom method ───────────────────────────────────────────

describe('custom', () => {
  it('should support custom API calls', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'http://localhost:3000',
      withCredentials: true,
    });

    setupMockFetch({ success: true, modelsCount: 42 });

    const result = await requireValue(provider.custom)({
      url: 'http://localhost:3000/channels/1/sync-models',
      method: 'post',
    });

    expect(result.data).toEqual({ success: true, modelsCount: 42 });
    const [url, init] = capturedRequest(mockFetchFn.mock.calls[0]);
    expect(url).toBe('http://localhost:3000/channels/1/sync-models');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
  });

  it('should apply query, sorters, and nested logical filters', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'http://localhost:3000/api',
    });
    const filters: Filter[] = [
      { field: 'tenantId', operator: 'eq', value: 0 },
      {
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
      },
    ];

    setupMockFetch({ ok: true });

    await requireValue(provider.custom)({
      url: 'http://localhost:3000/api/reports?existing=yes',
      method: 'post',
      query: {
        page: 0,
        enabled: false,
        search: '',
        nullable: null,
        tags: ['one', 'two'],
      },
      sorters: [
        { field: 'createdAt', order: 'desc' },
        { field: 'name', order: 'asc' },
      ],
      filters,
    });

    const [rawUrl] = capturedRequest(mockFetchFn.mock.calls[0]);
    const url = new URL(rawUrl);
    expect(url.searchParams.get('existing')).toBe('yes');
    expect(url.searchParams.get('page')).toBe('0');
    expect(url.searchParams.get('enabled')).toBe('false');
    expect(url.searchParams.get('search')).toBe('');
    expect(url.searchParams.get('nullable')).toBe('null');
    expect(url.searchParams.getAll('tags')).toEqual(['one', 'two']);
    expect(url.searchParams.get('_sort')).toBe('createdAt,name');
    expect(url.searchParams.get('_order')).toBe('desc,asc');
    expect(JSON.parse(requireValue(url.searchParams.get('_filters')))).toEqual(filters);
  });

  it('should keep provider credentials on same-origin requests', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'https://api.example.com/v1',
      headers: {
        Authorization: 'Bearer provider-token',
        Cookie: 'session=provider-session',
        'X-API-Key': 'provider-key',
        'X-Tenant': 'tenant-a',
      },
      withCredentials: true,
    });

    setupMockFetch({ ok: true });
    await requireValue(provider.custom)({
      url: 'https://api.example.com/v1/reports',
      method: 'get',
    });

    const [, init] = capturedRequest(mockFetchFn.mock.calls[0]);
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer provider-token');
    expect(headers.get('Cookie')).toBe('session=provider-session');
    expect(headers.get('X-API-Key')).toBe('provider-key');
    expect(headers.get('X-Tenant')).toBe('tenant-a');
    expect(init.credentials).toBe('include');
  });

  it('should not inherit provider defaults on cross-origin requests', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'https://api.example.com/v1',
      headers: {
        Authorization: 'Bearer provider-token',
        Cookie: 'session=provider-session',
        'X-API-Key': 'provider-key',
        'X-Tenant': 'tenant-a',
        'X-Client-Secret': 'provider-secret',
      },
      withCredentials: true,
    });

    setupMockFetch({ ok: true });
    await requireValue(provider.custom)({
      url: 'https://analytics.example.net/report',
      method: 'get',
      headers: { 'X-Request-ID': 'request-1' },
    });

    const [, init] = capturedRequest(mockFetchFn.mock.calls[0]);
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('Cookie')).toBeNull();
    expect(headers.get('X-API-Key')).toBeNull();
    expect(headers.get('X-Tenant')).toBeNull();
    expect(headers.get('X-Client-Secret')).toBeNull();
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Request-ID')).toBe('request-1');
    expect(init.credentials).toBeUndefined();
  });

  it('should allow an explicit cross-origin authorization header', async () => {
    const provider = createElysiaDataProvider({
      apiUrl: 'https://api.example.com/v1',
      headers: { Authorization: 'Bearer provider-token' },
    });

    setupMockFetch({ ok: true });
    await requireValue(provider.custom)({
      url: 'https://analytics.example.net/report',
      method: 'get',
      headers: { Authorization: 'Bearer analytics-token' },
    });

    const [, init] = capturedRequest(mockFetchFn.mock.calls[0]);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer analytics-token');
  });

  for (const [name, payload, expectedBody] of [
    ['zero', 0, '0'],
    ['false', false, 'false'],
    ['empty string', '', '""'],
    ['null', null, 'null'],
  ] as const) {
    it(`should preserve a ${name} payload`, async () => {
      const provider = createElysiaDataProvider({ apiUrl: 'http://localhost:3000' });
      setupMockFetch({ ok: true });

      await requireValue(provider.custom)({
        url: 'http://localhost:3000/echo',
        method: 'post',
        payload,
      });

      const [, init] = capturedRequest(mockFetchFn.mock.calls[0]);
      expect(init.body).toBe(expectedBody);
    });
  }

  it('should not parse JSON for a 204 response', async () => {
    const json = mock(() => Promise.reject(new Error('json() must not be called')));
    const text = mock(() => Promise.resolve(''));
    setupResponse(() => Object.assign(new Response(null, {
      status: 204,
      statusText: 'No Content',
    }), { json, text }));

    const provider = createElysiaDataProvider({ apiUrl: 'http://localhost:3000' });
    const result = await requireValue(provider.custom)({
      url: 'http://localhost:3000/empty',
      method: 'delete',
    });

    expect(result.data).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });

  it('should not parse JSON for a 205 response', async () => {
    const json = mock(() => Promise.reject(new Error('json() must not be called')));
    const text = mock(() => Promise.resolve(''));
    setupResponse(() => Object.assign(new Response(null, {
      status: 205,
      statusText: 'Reset Content',
    }), { json, text }));

    const provider = createElysiaDataProvider({ apiUrl: 'http://localhost:3000' });
    const result = await requireValue(provider.custom)({
      url: 'http://localhost:3000/empty',
      method: 'post',
    });

    expect(result.data).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });

  it('should not parse JSON when Content-Length is zero', async () => {
    const json = mock(() => Promise.reject(new Error('json() must not be called')));
    const text = mock(() => Promise.reject(new Error('text() must not be called')));
    setupResponse(() => Object.assign(new Response(null, {
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Length': '0' }),
    }), { json, text }));

    const provider = createElysiaDataProvider({ apiUrl: 'http://localhost:3000' });
    const result = await requireValue(provider.custom)({
      url: 'http://localhost:3000/empty',
      method: 'get',
    });

    expect(result.data).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });

  it('should not parse JSON when the response body is actually empty', async () => {
    const json = mock(() => Promise.reject(new Error('json() must not be called')));
    const text = mock(() => Promise.resolve(''));
    setupResponse(() => Object.assign(new Response(null, {
      status: 200,
      statusText: 'OK',
    }), { json, text }));

    const provider = createElysiaDataProvider({ apiUrl: 'http://localhost:3000' });
    const result = await requireValue(provider.custom)({
      url: 'http://localhost:3000/empty',
      method: 'get',
    });

    expect(result.data).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(text).toHaveBeenCalledTimes(1);
  });
});

// ─── bulk operations ─────────────────────────────────────────

describe('bulk operations', () => {
  it('should support getMany', async () => {
    const provider = createElysiaDataProvider({ apiUrl: 'http://localhost:3000' });
    setupMockFetch([{ id: 1 }, { id: 2 }]);

    const result = await requireValue(provider.getMany)({ resource: 'posts', ids: [1, 2] });
    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);

    const [url] = capturedRequest(mockFetchFn.mock.calls[0]);
    expect(url).toContain('id=1&id=2');
  });

  it('should support createMany', async () => {
    const provider = createElysiaDataProvider({ apiUrl: 'http://localhost:3000' });
    setupMockFetch({ id: 1, name: 'A' });

    await requireValue(provider.createMany)({
      resource: 'posts',
      variables: [{ name: 'A' }, { name: 'B' }],
    });

    expect(mockFetchFn).toHaveBeenCalledTimes(2);
  });

  it('should support deleteMany', async () => {
    const provider = createElysiaDataProvider({ apiUrl: 'http://localhost:3000' });
    setupMockFetch({ success: true });

    await requireValue(provider.deleteMany)({ resource: 'posts', ids: [1, 2, 3] });

    expect(mockFetchFn).toHaveBeenCalledTimes(3);
    for (const call of mockFetchFn.mock.calls) {
      const [, init] = capturedRequest(call);
      expect(init.method).toBe('DELETE');
    }
  });

  it('should preserve every deleted id when deleteMany receives 204 responses', async () => {
    const provider = createElysiaDataProvider({ apiUrl: 'http://localhost:3000' });
    setupNoContentFetch();

    const result = await requireValue(provider.deleteMany)({ resource: 'posts', ids: [1, 2] });

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should encode every updateMany and deleteMany id path segment', async () => {
    const provider = createElysiaDataProvider({ apiUrl: 'http://localhost:3000' });
    const ids = ['../admin', 'folder/item?draft#top'];
    const expectedUrls = [
      'http://localhost:3000/posts/..%2Fadmin',
      'http://localhost:3000/posts/folder%2Fitem%3Fdraft%23top',
    ];

    setupMockFetch({ ok: true });
    await requireValue(provider.updateMany)({ resource: 'posts', ids, variables: { active: true } });
    expect(mockFetchFn.mock.calls.map(call => (capturedRequest(call))[0])).toEqual(expectedUrls);

    setupMockFetch({ ok: true });
    await requireValue(provider.deleteMany)({ resource: 'posts', ids });
    expect(mockFetchFn.mock.calls.map(call => (capturedRequest(call))[0])).toEqual(expectedUrls);
  });
});
