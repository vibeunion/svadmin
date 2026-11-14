import { describe, expect, it } from 'bun:test';
import { createOramaDataProvider } from './orama-data-provider.js';

describe('@svadmin/orama DataProvider', () => {
  const initialArticles = [
    { id: 'art-1', title: 'Svelte 5 Runes Deep Dive', category: 'frontend', views: 1500 },
    { id: 'art-2', title: 'High Performance In-Memory Search Engine', category: 'backend', views: 3200 },
    { id: 'art-3', title: 'Micro-Frontend Runtime Architecture', category: 'frontend', views: 800 },
  ];

  it('performs list querying with pagination and exact category filtering', async () => {
    const provider = createOramaDataProvider({
      initialData: { articles: initialArticles },
    });

    const res = await provider.getList({
      resource: 'articles',
      pagination: { current: 1, pageSize: 2 },
      filters: [
        {
          field: 'category',
          operator: 'eq',
          value: 'frontend',
        },
      ],
    });

    expect(res.total).toBe(2);
    expect(res.data.length).toBe(2);
    expect(res.data[0]?.['title']).toBe('Svelte 5 Runes Deep Dive');
    expect(res.data[1]?.['title']).toBe('Micro-Frontend Runtime Architecture');
  });

  it('performs full-text keyword search and ranks results by score', async () => {
    const provider = createOramaDataProvider({
      initialData: { articles: initialArticles },
    });

    const res = await provider.getList({
      resource: 'articles',
      meta: { search: 'search engine' },
    });

    expect(res.total).toBe(1);
    expect(res.data[0]?.['id']).toBe('art-2');
    expect(res.data[0]?.['_score']).toBe(100);
  });

  it('executes typo-tolerant fuzzy matching', async () => {
    const provider = createOramaDataProvider({
      initialData: { articles: initialArticles },
      tolerance: 1,
    });

    // "runes" typed as "runse" or "rune"
    const res = await provider.getList({
      resource: 'articles',
      meta: { search: 'rune' },
    });

    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0]?.['id']).toBe('art-1');
  });

  it('supports sorting by numeric fields in descending order', async () => {
    const provider = createOramaDataProvider({
      initialData: { articles: initialArticles },
    });

    const res = await provider.getList({
      resource: 'articles',
      sorters: [{ field: 'views', order: 'desc' }],
    });

    expect(res.data[0]?.['views']).toBe(3200);
    expect(res.data[1]?.['views']).toBe(1500);
    expect(res.data[2]?.['views']).toBe(800);
  });

  it('handles create, update, getOne, and delete lifecycle', async () => {
    const provider = createOramaDataProvider();

    // 1. Create
    const createRes = await provider.create({
      resource: 'products',
      variables: {
        id: 'prod-100',
        name: 'Edge Gateway Device',
        price: 999,
      },
    });
    expect(createRes.data['id']).toBe('prod-100');

    // 2. GetOne
    const getRes = await provider.getOne({
      resource: 'products',
      id: 'prod-100',
    });
    expect(getRes.data['name']).toBe('Edge Gateway Device');

    // 3. Update
    const updateRes = await provider.update({
      resource: 'products',
      id: 'prod-100',
      variables: { price: 899 },
    });
    expect(updateRes.data['price']).toBe(899);

    // 4. DeleteOne
    const deleteRes = await provider.deleteOne({
      resource: 'products',
      id: 'prod-100',
    });
    expect(deleteRes.data['id']).toBe('prod-100');

    // Verify gone
    expect(provider.getOne({ resource: 'products', id: 'prod-100' })).rejects.toThrow();
  });

  it('supports custom administrative operations', async () => {
    const provider = createOramaDataProvider({
      initialData: { test: [{ id: 1 }] },
    });

    const statRes = await provider.custom!({ url: 'stats', method: 'get' });
    expect((statRes.data as Record<string, unknown>)['totalCollections']).toBe(1);

    const clearRes = await provider.custom!({ url: 'clear', method: 'post' });
    expect((clearRes.data as Record<string, unknown>)['cleared']).toBe(true);
  });
});
