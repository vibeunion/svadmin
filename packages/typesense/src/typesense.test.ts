import { describe, expect, it } from 'bun:test';
import {
  createTypesenseDataProvider,
  buildTypesenseFilter,
  type FetchLike,
} from './typesense-data-provider';

describe('@svadmin/typesense DataProvider', () => {
  it('translates filters and search keywords into Typesense filter_by string', () => {
    const { filterString, searchQuery } = buildTypesenseFilter([
      { field: 'q', operator: 'eq', value: 'svelte admin' },
      { field: 'status', operator: 'eq', value: 'published' },
      { field: 'views', operator: 'gte', value: 100 },
      { field: 'price', operator: 'lt', value: 50 },
      { field: 'tags', operator: 'in', value: ['tech', 'admin'] },
      { field: 'archived', operator: 'ne', value: true },
      {
        operator: 'or',
        value: [
          { field: 'category', operator: 'eq', value: 'frontend' },
          { field: 'category', operator: 'eq', value: 'fullstack' },
        ],
      },
    ]);

    expect(searchQuery).toBe('svelte admin');
    expect(filterString).toContain('status:=`published`');
    expect(filterString).toContain('views:>=100');
    expect(filterString).toContain('price:<50');
    expect(filterString).toContain('tags:=[`tech`, `admin`]');
    expect(filterString).toContain('archived:!=true');
    expect(filterString).toContain('(category:=`frontend` || category:=`fullstack`)');
  });

  it('executes getList with search keyword, pagination, filters, sorters, and highlights', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    const mockFetch: FetchLike = async (input, init) => {
      capturedUrl = String(input);
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      return new Response(
        JSON.stringify({
          facet_counts: [
            {
              field_name: 'category',
              counts: [{ count: 15, value: 'guide' }],
            },
          ],
          found: 42,
          hits: [
            {
              document: { id: 'doc-1', title: 'Typesense Guide', views: 500, category: 'guide' },
              highlights: [
                {
                  field: 'title',
                  snippet: '<mark>Typesense</mark> Guide',
                },
              ],
            },
            {
              document: { id: 'doc-2', title: 'Enterprise Admin', views: 320, category: 'guide' },
            },
          ],
          out_of: 42,
          page: 2,
          search_time_ms: 2,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const provider = createTypesenseDataProvider({
      host: 'http://localhost:8108',
      apiKey: 'xyz_typesense_api_key',
      collectionMap: {
        articles: 'company_articles_v2',
      },
      queryBy: 'title,description',
      fetch: mockFetch,
    });

    const result = await provider.getList({
      resource: 'articles',
      pagination: { current: 2, pageSize: 10 },
      sorters: [{ field: 'views', order: 'desc' }],
      filters: [
        { field: 'q', operator: 'eq', value: 'Typesense' },
        { field: 'category', operator: 'eq', value: 'guide' },
      ],
      meta: {
        facets: ['category'],
      },
    });

    expect(capturedUrl).toContain('http://localhost:8108/collections/company_articles_v2/documents/search?');
    expect(capturedUrl).toContain('q=Typesense');
    expect(capturedUrl).toContain('query_by=title%2Cdescription');
    expect(capturedUrl).toContain('page=2');
    expect(capturedUrl).toContain('per_page=10');
    expect(capturedUrl).toContain('sort_by=views%3Adesc');
    expect(capturedUrl).toContain('filter_by=category%3A%3D%60guide%60');
    expect(capturedUrl).toContain('facet_by=category');
    expect(capturedUrl).toContain('highlight_fields=*');
    expect(capturedHeaders['X-TYPESENSE-API-KEY']).toBe('xyz_typesense_api_key');

    expect(result.total).toBe(42);
    expect(result.data.length).toBe(2);
    expect(result.data[0]?.['id']).toBe('doc-1');
    expect(result.data[0]?.['_highlight']).toBeDefined();
  });

  it('defaults to q=* and wildcard query_by when no keyword is specified', async () => {
    let capturedUrl = '';

    const mockFetch: FetchLike = async (input) => {
      capturedUrl = String(input);
      return new Response(
        JSON.stringify({
          found: 1,
          hits: [{ document: { id: 'item-1', name: 'Standard Item' } }],
          out_of: 1,
          page: 1,
          search_time_ms: 1,
        }),
        { status: 200 },
      );
    };

    const provider = createTypesenseDataProvider({
      host: 'http://localhost:8108',
      apiKey: 'test-key',
      fetch: mockFetch,
    });

    const result = await provider.getList({
      resource: 'items',
    });

    expect(capturedUrl).toContain('q=*');
    expect(capturedUrl).toContain('query_by=*');
    expect(result.total).toBe(1);
    expect(result.data[0]?.['id']).toBe('item-1');
  });

  it('retrieves a single document via getOne', async () => {
    const mockFetch: FetchLike = async (input) => {
      expect(String(input)).toBe('http://localhost:8108/collections/products/documents/prod-99');
      return new Response(
        JSON.stringify({ id: 'prod-99', name: 'High-speed SSD', price: 129 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const provider = createTypesenseDataProvider({
      host: 'http://localhost:8108',
      apiKey: 'key123',
      fetch: mockFetch,
    });

    const result = await provider.getOne({
      resource: 'products',
      id: 'prod-99',
    });

    expect(result.data['id']).toBe('prod-99');
    expect(result.data['name']).toBe('High-speed SSD');
    expect(result.data['price']).toBe(129);
  });

  it('creates, updates and deletes documents', async () => {
    let methodCalled = '';
    let urlCalled = '';
    let bodySent: unknown = null;

    const mockFetch: FetchLike = async (input, init) => {
      urlCalled = String(input);
      methodCalled = init?.method ?? 'GET';
      bodySent = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(JSON.stringify({ id: 'doc-88', title: 'Typesense Doc' }), { status: 200 });
    };

    const provider = createTypesenseDataProvider({
      host: 'http://localhost:8108',
      apiKey: 'key123',
      fetch: mockFetch,
    });

    // Create
    const createRes = await provider.create({
      resource: 'docs',
      variables: { title: 'Typesense Doc', rank: 1 },
    });
    expect(methodCalled).toBe('POST');
    expect(urlCalled).toBe('http://localhost:8108/collections/docs/documents?action=create');
    expect(bodySent).toEqual({ title: 'Typesense Doc', rank: 1 });
    expect(createRes.data['title']).toBe('Typesense Doc');

    // Create with upsert
    await provider.create({
      resource: 'docs',
      variables: { id: 'doc-88', title: 'Typesense Doc Upsert' },
      meta: { upsert: true },
    });
    expect(urlCalled).toBe('http://localhost:8108/collections/docs/documents?action=upsert');

    // Update
    const updateRes = await provider.update({
      resource: 'docs',
      id: 'doc-88',
      variables: { rank: 2 },
    });
    expect(methodCalled).toBe('PATCH');
    expect(urlCalled).toBe('http://localhost:8108/collections/docs/documents/doc-88');
    expect(bodySent).toEqual({ rank: 2 });
    expect(updateRes.data['id']).toBe('doc-88');

    // Delete
    const deleteRes = await provider.deleteOne({
      resource: 'docs',
      id: 'doc-88',
    });
    expect(methodCalled).toBe('DELETE');
    expect(urlCalled).toBe('http://localhost:8108/collections/docs/documents/doc-88');
    expect(deleteRes.data['id']).toBe('doc-88');
  });

  it('handles server error responses gracefully', async () => {
    const mockFetch: FetchLike = async () => {
      return new Response(
        JSON.stringify({ message: 'Collection `missing_coll` not found' }),
        { status: 404, statusText: 'Not Found' },
      );
    };

    const provider = createTypesenseDataProvider({
      host: 'http://localhost:8108',
      apiKey: 'key',
      fetch: mockFetch,
    });

    await expect(provider.getOne({ resource: 'missing_coll', id: '1' })).rejects.toThrow(
      'Typesense request failed (404 Not Found): Collection `missing_coll` not found',
    );
  });

  it('supports custom endpoint calls and getApiUrl', async () => {
    let capturedMethod = '';
    const mockFetch: FetchLike = async (_input, init) => {
      capturedMethod = init?.method ?? 'GET';
      return new Response(JSON.stringify([{ name: 'collection1' }]), { status: 200 });
    };

    const provider = createTypesenseDataProvider({
      host: 'http://localhost:8108',
      apiKey: 'key',
      fetch: mockFetch,
    });

    expect(provider.custom).toBeDefined();
    expect(provider.getApiUrl).toBeDefined();

    const customRes = await provider.custom!({
      url: '/collections',
      method: 'get',
    });

    expect(capturedMethod).toBe('GET');
    expect(customRes.data).toEqual([{ name: 'collection1' }]);
    expect(provider.getApiUrl!()).toBe('http://localhost:8108');
  });
});
