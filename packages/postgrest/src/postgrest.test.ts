import { describe, it, expect, mock } from 'bun:test';
import {
  createPostgrestDataProvider,
  mapOperatorToPostgrest,
  buildPostgrestFilterQuery,
} from './postgrest-data-provider.js';

describe('@svadmin/postgrest', () => {
  it('maps SvAdmin operators to PostgREST syntax correctly', () => {
    expect(mapOperatorToPostgrest('eq')).toBe('eq');
    expect(mapOperatorToPostgrest('ne')).toBe('neq');
    expect(mapOperatorToPostgrest('gt')).toBe('gt');
    expect(mapOperatorToPostgrest('gte')).toBe('gte');
    expect(mapOperatorToPostgrest('lt')).toBe('lt');
    expect(mapOperatorToPostgrest('lte')).toBe('lte');
    expect(mapOperatorToPostgrest('in')).toBe('in');
    expect(mapOperatorToPostgrest('contains')).toBe('cs');
    expect(mapOperatorToPostgrest('null')).toBe('is.null');
    expect(mapOperatorToPostgrest('nnull')).toBe('not.is.null');
  });

  it('builds query parameters from filter structures', () => {
    const params = buildPostgrestFilterQuery([
      { field: 'status', operator: 'eq', value: 'active' },
      { field: 'category', operator: 'in', value: ['tech', 'news'] },
      { field: 'deleted_at', operator: 'null', value: true },
      { field: 'name', operator: 'contains', value: 'admin' },
    ]);

    expect(params.get('status')).toBe('eq.active');
    expect(params.get('category')).toBe('in.(tech,news)');
    expect(params.get('deleted_at')).toBe('is.null');
    expect(params.get('name')).toBe('ilike.*admin*');
  });

  it('executes getList with Range pagination and exact count header', async () => {
    let capturedUrl = '';
    let capturedHeaders: HeadersInit | undefined;

    const mockFetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedHeaders = init?.headers;

      return new Response(JSON.stringify([{ id: 1, title: 'Item 1' }]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Range': '0-9/42',
        },
      });
    });

    const dataProvider = createPostgrestDataProvider({
      apiUrl: 'https://api.example.com',
      fetch: mockFetch,
    });

    const result = await dataProvider.getList({
      resource: 'posts',
      pagination: { current: 1, pageSize: 10 },
      sorters: [{ field: 'created_at', order: 'desc' }],
    });

    expect(capturedUrl).toContain('https://api.example.com/posts');
    expect(capturedUrl).toContain('order=created_at.desc');
    expect(capturedUrl).toContain('select=*');
    const headers = capturedHeaders as Record<string, string>;
    expect(headers['Range']).toBe('0-9');
    expect(headers['Prefer']).toBe('count=exact');

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(42);
  });

  it('retrieves a single object using application/vnd.pgrst.object+json', async () => {
    let capturedHeaders: HeadersInit | undefined;

    const mockFetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({ id: 101, title: 'Deep Post' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const dataProvider = createPostgrestDataProvider({
      apiUrl: 'https://api.example.com',
      fetch: mockFetch,
    });

    const result = await dataProvider.getOne({
      resource: 'posts',
      id: 101,
    });

    const headers = capturedHeaders as Record<string, string>;
    expect(headers['Accept']).toBe('application/vnd.pgrst.object+json');
    expect(result.data).toEqual({ id: 101, title: 'Deep Post' });
  });

  it('creates and updates entities requesting representation returns', async () => {
    const mockFetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ id: 200, ...body }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const dataProvider = createPostgrestDataProvider({
      apiUrl: 'https://api.example.com',
      fetch: mockFetch,
    });

    const createResult = await dataProvider.create({
      resource: 'posts',
      variables: { title: 'Created Post' },
    });
    expect(createResult.data).toEqual({ id: 200, title: 'Created Post' });

    const updateResult = await dataProvider.update({
      resource: 'posts',
      id: 200,
      variables: { title: 'Updated Post' },
    });
    expect(updateResult.data).toEqual({ id: 200, title: 'Updated Post' });
  });

  it('deletes an entity and returns result', async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ id: 300 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const dataProvider = createPostgrestDataProvider({
      apiUrl: 'https://api.example.com',
      fetch: mockFetch,
    });

    const result = await dataProvider.deleteOne({
      resource: 'posts',
      id: 300,
    });

    expect(result.data).toEqual({ id: 300 });
  });

  it('supports custom stored procedure (RPC) calls', async () => {
    let capturedMethod = '';
    let capturedBody = '';

    const mockFetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedMethod = init?.method ?? '';
      capturedBody = String(init?.body);
      return new Response(JSON.stringify({ success: true, count: 5 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const dataProvider = createPostgrestDataProvider({
      apiUrl: 'https://api.example.com',
      fetch: mockFetch,
    });

    expect(dataProvider.custom).toBeDefined();
    if (!dataProvider.custom) {
      throw new Error('custom method must be defined');
    }
    const result = await dataProvider.custom({
      url: '/rpc/bulk_archive',
      method: 'post',
      payload: { ids: [1, 2, 3] },
    });

    expect(capturedMethod).toBe('POST');
    expect(capturedBody).toContain('ids');
    expect(result.data).toEqual({ success: true, count: 5 });
    expect(dataProvider.getApiUrl()).toBe('https://api.example.com');
  });
});
