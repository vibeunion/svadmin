import { describe, expect, test } from 'bun:test';
import type { GetListParams } from '@svadmin/core';
import { createRefineAdapter } from './index';

type RefineGetListParams = Omit<GetListParams, 'pagination'> & {
  pagination?: NonNullable<GetListParams['pagination']> & { currentPage?: number };
};

function createMockRefineProvider() {
  const provider = {
    apiUrl: 'https://api.example.test',
    getApiUrl() {
      return this.apiUrl;
    },
    async getList() {
      return { data: [{ id: 1, name: this.apiUrl }], total: 1 };
    },
    async getOne() {
      return { data: { id: 1, name: this.apiUrl } };
    },
    async create() {
      return { data: { id: 2, name: this.apiUrl } };
    },
    async update() {
      return { data: { id: 1, name: this.apiUrl } };
    },
    async deleteOne() {
      return { data: { id: 1, deleted: true } };
    },
    async getMany() {
      return { data: [{ id: 1 }, { id: 2 }] };
    },
    async custom() {
      return { data: { ok: true, apiUrl: this.apiUrl } };
    },
  };

  return provider;
}

describe('createRefineAdapter', () => {
  test('maps svadmin current pagination to Refine currentPage', async () => {
    let receivedParams: RefineGetListParams | undefined;
    const refineProvider = {
      ...createMockRefineProvider(),
      async getList(params: RefineGetListParams) {
        receivedParams = params;
        return { data: [], total: 0 };
      },
    };
    const adapter = createRefineAdapter(refineProvider);

    await adapter.getList({
      resource: 'posts',
      pagination: { current: 2, pageSize: 25, mode: 'server' },
    });

    expect(receivedParams).toEqual({
      resource: 'posts',
      pagination: { current: 2, currentPage: 2, pageSize: 25, mode: 'server' },
    });
  });

  test('binds required and optional Refine data provider methods', async () => {
    const adapter = createRefineAdapter(createMockRefineProvider());

    expect(adapter.getApiUrl()).toBe('https://api.example.test');
    await expect(adapter.getList({ resource: 'posts' })).resolves.toEqual({
      data: [{ id: 1, name: 'https://api.example.test' }],
      total: 1,
    });
    await expect(adapter.getOne({ resource: 'posts', id: 1 })).resolves.toEqual({
      data: { id: 1, name: 'https://api.example.test' },
    });
    await expect(adapter.getMany?.({ resource: 'posts', ids: [1, 2] })).resolves.toEqual({
      data: [{ id: 1 }, { id: 2 }],
    });
    await expect(adapter.custom?.({ url: '/health', method: 'get' })).resolves.toEqual({
      data: { ok: true, apiUrl: 'https://api.example.test' },
    });
  });

  test('does not expose optional methods missing from the Refine provider', () => {
    const minimalProvider = createMockRefineProvider();
    delete (minimalProvider as Partial<typeof minimalProvider>).getMany;
    delete (minimalProvider as Partial<typeof minimalProvider>).custom;
    const adapter = createRefineAdapter(minimalProvider);

    expect(adapter.getMany).toBeUndefined();
    expect(adapter.custom).toBeUndefined();
  });

  test('falls back to empty api URL when the Refine provider omits getApiUrl', () => {
    const minimalProvider = createMockRefineProvider();
    delete (minimalProvider as Partial<typeof minimalProvider>).getApiUrl;
    const adapter = createRefineAdapter(minimalProvider);

    expect(adapter.getApiUrl()).toBe('');
  });

  test('rejects non-object provider values', () => {
    expect(() => createRefineAdapter(null)).toThrow(
      '[svadmin] createRefineAdapter: expected a valid Refine DataProvider object, got null',
    );
  });

  test('rejects providers missing required methods', () => {
    const invalidProvider = { ...createMockRefineProvider(), deleteOne: undefined };

    expect(() => createRefineAdapter(invalidProvider)).toThrow(
      '[svadmin] createRefineAdapter: missing required Refine DataProvider method "deleteOne"',
    );
  });
});
