import { describe, expect, it } from 'bun:test';
import {
  createMeilisearchDataProvider,
  buildMeilisearchFilter,
  type FetchLike,
} from './meilisearch-data-provider';

describe('@svadmin/meilisearch DataProvider', () => {
  it('translates filters and queries into Meilisearch filter string', () => {
    const { filterString, searchQuery } = buildMeilisearchFilter([
      { field: 'q', operator: 'eq', value: 'svelte' },
      { field: 'status', operator: 'eq', value: 'published' },
      { field: 'views', operator: 'gte', value: 100 },
      { field: 'tags', operator: 'in', value: ['tech', 'admin'] },
      {
        operator: 'or',
        value: [
          { field: 'category', operator: 'eq', value: 'frontend' },
          { field: 'category', operator: 'eq', value: 'fullstack' },
        ],
      },
    ]);

    expect(searchQuery).toBe('svelte');
    expect(filterString).toContain("status = 'published'");
    expect(filterString).toContain('views >= 100');
    expect(filterString).toContain("tags IN ['tech', 'admin']");
    expect(filterString).toContain("(category = 'frontend' OR category = 'fullstack')");
  });

  it('executes getList with search keyword, pagination, filters, and sorters', async () => {
    let capturedUrl = '';
    let capturedBody: Record<string, unknown> = {};
    let capturedHeaders: Record<string, string> = {};

    const mockFetch: FetchLike = async (input, init) => {
      capturedUrl = String(input);
      capturedBody = init?.body ? JSON.parse(String(init.body)) : {};
      capturedHeaders = init?.headers as Record<string, string>;
      return new Response(
        JSON.stringify({
          hits: [
            { id: 1, title: 'Meilisearch & Svelte Guide', views: 500 },
            { id: 2, title: 'Enterprise Admin Dashboard', views: 320 },
          ],
          offset: 10,
          limit: 10,
          totalHits: 48,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const provider = createMeilisearchDataProvider({
      host: 'http://localhost:7700',
      apiKey: 'masterKey123',
      fetch: mockFetch,
    });

    const result = await provider.getList({
      resource: 'articles',
      pagination: { current: 2, pageSize: 10 },
      sorters: [{ field: 'views', order: 'desc' }],
      filters: [
        { field: 'q', operator: 'eq', value: 'dashboard' },
        { field: 'status', operator: 'eq', value: 'active' },
      ],
    });

    expect(capturedUrl).toBe('http://localhost:7700/indexes/articles/search');
    expect(capturedHeaders['Authorization']).toBe('Bearer masterKey123');
    expect(capturedBody['q']).toBe('dashboard');
    expect(capturedBody['offset']).toBe(10);
    expect(capturedBody['limit']).toBe(10);
    expect(capturedBody['sort']).toEqual(['views:desc']);
    expect(capturedBody['filter']).toBe("status = 'active'");
    expect(capturedBody['attributesToHighlight']).toEqual(['*']);

    expect(result.total).toBe(48);
    expect(result.data.length).toBe(2);
    expect(result.data[0]?.['id']).toBe(1);
  });

  it('retrieves a single document via getOne', async () => {
    const mockFetch: FetchLike = async (input) => {
      expect(String(input)).toBe('http://localhost:7700/indexes/products/documents/prod-100');
      return new Response(
        JSON.stringify({ id: 'prod-100', name: 'Cloud Server', price: 99 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const provider = createMeilisearchDataProvider({
      host: 'http://localhost:7700',
      fetch: mockFetch,
    });

    const result = await provider.getOne({
      resource: 'products',
      id: 'prod-100',
    });

    expect(result.data['id']).toBe('prod-100');
    expect(result.data['name']).toBe('Cloud Server');
  });

  it('creates, updates and deletes documents', async () => {
    let methodCalled = '';
    let bodySent: unknown = null;

    const mockFetch: FetchLike = async (_input, init) => {
      methodCalled = init?.method ?? 'GET';
      bodySent = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(JSON.stringify({ taskUid: 1, status: 'enqueued' }), { status: 200 });
    };

    const provider = createMeilisearchDataProvider({
      host: 'http://localhost:7700',
      fetch: mockFetch,
    });

    // Create
    const createRes = await provider.create({
      resource: 'items',
      variables: { title: 'New Item', count: 5 },
    });
    expect(methodCalled).toBe('POST');
    expect(bodySent).toEqual([{ title: 'New Item', count: 5 }]);
    expect(createRes.data['title']).toBe('New Item');

    // Update
    const updateRes = await provider.update({
      resource: 'items',
      id: 'item-1',
      variables: { count: 6 },
    });
    expect(methodCalled).toBe('PUT');
    expect(bodySent).toEqual([{ id: 'item-1', count: 6 }]);
    expect(updateRes.data['count']).toBe(6);

    // Delete
    const deleteRes = await provider.deleteOne({
      resource: 'items',
      id: 'item-1',
    });
    expect(methodCalled).toBe('DELETE');
    expect(deleteRes.data['id']).toBe('item-1');
  });

  it('handles server error responses gracefully', async () => {
    const mockFetch: FetchLike = async () => {
      return new Response(
        JSON.stringify({ message: 'Index `invalid_index` not found.', code: 'index_not_found' }),
        { status: 404, statusText: 'Not Found' },
      );
    };

    const provider = createMeilisearchDataProvider({
      host: 'http://localhost:7700',
      fetch: mockFetch,
    });

    expect(
      provider.getOne({ resource: 'invalid_index', id: '1' }),
    ).rejects.toThrow('Meilisearch request failed (404 Not Found): Index `invalid_index` not found.');
  });
});
