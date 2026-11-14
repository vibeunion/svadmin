import { describe, expect, it } from 'bun:test';
import {
  createQdrantDataProvider,
  buildQdrantFilter,
  type FetchLike,
} from './qdrant-data-provider';

describe('@svadmin/qdrant DataProvider', () => {
  it('translates svadmin filters into Qdrant filter structure', () => {
    const filter = buildQdrantFilter([
      { field: 'category', operator: 'eq', value: 'electronics' },
      { field: 'price', operator: 'gte', value: 100 },
      { field: 'price', operator: 'lt', value: 1000 },
      { field: 'tags', operator: 'in', value: ['gadget', 'wireless'] },
      { field: 'discontinued', operator: 'ne', value: true },
      {
        operator: 'or',
        value: [
          { field: 'vendor', operator: 'eq', value: 'Acme' },
          { field: 'vendor', operator: 'eq', value: 'Apex' },
        ],
      },
    ]);

    expect(filter).toBeDefined();
    expect(filter?.must).toBeDefined();
    expect(filter?.must_not).toBeDefined();
    expect(filter?.should).toBeDefined();

    // Check must match
    expect(filter?.must).toContainEqual({ key: 'category', match: { value: 'electronics' } });
    expect(filter?.must).toContainEqual({ key: 'price', range: { gte: 100 } });
    expect(filter?.must).toContainEqual({ key: 'price', range: { lt: 1000 } });
    expect(filter?.must).toContainEqual({ key: 'tags', match: { any: ['gadget', 'wireless'] } });

    // Check must_not match
    expect(filter?.must_not).toContainEqual({ key: 'discontinued', match: { value: true } });

    // Check should match
    expect(filter?.should?.length).toBeGreaterThan(0);
  });

  it('performs vector similarity search when meta.vector is provided', async () => {
    let capturedUrl = '';
    let capturedBody: Record<string, unknown> = {};
    let capturedHeaders: Record<string, string> = {};

    const mockFetch: FetchLike = async (input, init) => {
      capturedUrl = String(input);
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      if (capturedUrl.includes('/points/search')) {
        capturedBody = init?.body ? JSON.parse(String(init.body)) : {};
        return new Response(
          JSON.stringify({
            result: [
              {
                id: 'p-1',
                score: 0.94,
                payload: { title: 'Smartphone Pro', price: 999 },
              },
              {
                id: 'p-2',
                score: 0.88,
                payload: { title: 'Tablet Air', price: 699 },
              },
            ],
            status: 'ok',
            time: 0.002,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (capturedUrl.includes('/points/count')) {
        return new Response(
          JSON.stringify({
            result: { count: 2 },
            status: 'ok',
          }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 200 });
    };

    const provider = createQdrantDataProvider({
      host: 'http://localhost:6333',
      apiKey: 'test-qdrant-key',
      collectionMap: {
        products: 'products_v1',
      },
      fetch: mockFetch,
    });

    const result = await provider.getList({
      resource: 'products',
      pagination: { current: 1, pageSize: 10 },
      meta: {
        vector: [0.12, 0.45, 0.78],
      },
      filters: [{ field: 'in_stock', operator: 'eq', value: true }],
    });

    expect(capturedUrl).toContain('/collections/products_v1/points/');
    expect(capturedHeaders['api-key']).toBe('test-qdrant-key');
    expect(capturedBody['vector']).toEqual([0.12, 0.45, 0.78]);
    expect(capturedBody['limit']).toBe(10);
    expect(capturedBody['filter']).toEqual({
      must: [{ key: 'in_stock', match: { value: true } }],
    });

    expect(result.total).toBe(2);
    expect(result.data.length).toBe(2);
    expect(result.data[0]?.['id']).toBe('p-1');
    expect(result.data[0]?.['_score']).toBe(0.94);
    expect(result.data[0]?.['title']).toBe('Smartphone Pro');
  });

  it('scrolls through points when meta.vector is omitted', async () => {
    const capturedUrls: string[] = [];
    let capturedBody: Record<string, unknown> = {};

    const mockFetch: FetchLike = async (input, init) => {
      const url = String(input);
      capturedUrls.push(url);
      if (url.includes('/points/scroll')) {
        capturedBody = init?.body ? JSON.parse(String(init.body)) : {};
        return new Response(
          JSON.stringify({
            result: {
              points: [{ id: 'p-100', payload: { name: 'Item 100' } }],
              next_page_offset: 'p-101',
            },
            status: 'ok',
            time: 0.001,
          }),
          { status: 200 },
        );
      }
      if (url.includes('/points/count')) {
        return new Response(JSON.stringify({ result: { count: 1 } }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    };

    const provider = createQdrantDataProvider({
      host: 'http://localhost:6333',
      fetch: mockFetch,
    });

    const result = await provider.getList({
      resource: 'items',
      pagination: { current: 1, pageSize: 5 },
    });

    expect(capturedUrls.some((u) => u.includes('/collections/items/points/scroll'))).toBe(true);
    expect(capturedBody['limit']).toBe(5);
    expect(result.data.length).toBe(1);
    expect(result.data[0]?.['id']).toBe('p-100');
    expect(result.data[0]?.['name']).toBe('Item 100');
  });

  it('retrieves a single point via getOne', async () => {
    const mockFetch: FetchLike = async (input) => {
      expect(String(input)).toBe('http://localhost:6333/collections/knowledge/points/doc-77');
      return new Response(
        JSON.stringify({
          result: {
            id: 'doc-77',
            payload: { title: 'Qdrant Architecture', views: 1200 },
          },
        }),
        { status: 200 },
      );
    };

    const provider = createQdrantDataProvider({
      host: 'http://localhost:6333',
      fetch: mockFetch,
    });

    const res = await provider.getOne({
      resource: 'knowledge',
      id: 'doc-77',
    });

    expect(res.data['id']).toBe('doc-77');
    expect(res.data['title']).toBe('Qdrant Architecture');
  });

  it('handles create, update and delete operations', async () => {
    let methodCalled = '';
    let urlCalled = '';
    let bodySent: unknown = null;

    const mockFetch: FetchLike = async (input, init) => {
      urlCalled = String(input);
      methodCalled = init?.method ?? 'GET';
      bodySent = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(JSON.stringify({ status: 'ok', result: { operation_id: 1 } }), { status: 200 });
    };

    const provider = createQdrantDataProvider({
      host: 'http://localhost:6333',
      fetch: mockFetch,
    });

    // 1. Create point
    const createRes = await provider.create({
      resource: 'embeddings',
      variables: {
        id: 'pt-1',
        vector: [0.1, 0.2, 0.3],
        content: 'Vector document',
      },
    });

    expect(methodCalled).toBe('PUT');
    expect(urlCalled).toBe('http://localhost:6333/collections/embeddings/points?wait=true');
    expect(bodySent).toEqual({
      points: [
        {
          id: 'pt-1',
          vector: [0.1, 0.2, 0.3],
          payload: { content: 'Vector document' },
        },
      ],
    });
    expect(createRes.data['id']).toBe('pt-1');

    // 2. Update point payload
    const updateRes = await provider.update({
      resource: 'embeddings',
      id: 'pt-1',
      variables: {
        content: 'Updated document',
      },
    });

    expect(methodCalled).toBe('POST');
    expect(urlCalled).toBe('http://localhost:6333/collections/embeddings/points/payload?wait=true');
    expect(updateRes.data['content']).toBe('Updated document');

    // 3. Delete point
    const deleteRes = await provider.deleteOne({
      resource: 'embeddings',
      id: 'pt-1',
    });

    expect(methodCalled).toBe('POST');
    expect(urlCalled).toBe('http://localhost:6333/collections/embeddings/points/delete?wait=true');
    expect(deleteRes.data['id']).toBe('pt-1');
  });

  it('supports custom queries and returns base API URL', async () => {
    const mockFetch: FetchLike = async (_input, init) => {
      expect(init?.method).toBe('GET');
      return new Response(JSON.stringify({ result: { collections: [] } }), { status: 200 });
    };

    const provider = createQdrantDataProvider({
      host: 'http://localhost:6333',
      fetch: mockFetch,
    });

    const res = await provider.custom!({
      url: '/collections',
      method: 'get',
    });

    expect(res.data).toBeDefined();
    expect(provider.getApiUrl!()).toBe('http://localhost:6333');
  });
});
