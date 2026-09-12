import { describe, expect, test } from 'bun:test';
import type { GetListParams } from '@svadmin/core';
import { HttpError } from '../../core/src/types';
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
    const minimalProvider: Partial<ReturnType<typeof createMockRefineProvider>> = createMockRefineProvider();
    delete minimalProvider.getMany;
    delete minimalProvider.custom;
    const adapter = createRefineAdapter(minimalProvider);

    expect(adapter.getMany).toBeUndefined();
    expect(adapter.custom).toBeUndefined();
  });

  test('falls back to empty api URL when the Refine provider omits getApiUrl', () => {
    const minimalProvider: Partial<ReturnType<typeof createMockRefineProvider>> = createMockRefineProvider();
    delete minimalProvider.getApiUrl;
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

  test('rejects malformed required responses even when methods exist', async () => {
    const adapter = createRefineAdapter({
      ...createMockRefineProvider(),
      getList: async () => ({ data: [null], total: 1 }),
      getOne: async () => ({ data: 'private-row' }),
      create: async () => null,
      update: async () => ({ data: [] }),
      deleteOne: async () => ({}),
    });
    await expect(adapter.getList({ resource: 'posts' })).rejects.toBeInstanceOf(HttpError);
    await expect(adapter.getOne({ resource: 'posts', id: 1 })).rejects.toBeInstanceOf(HttpError);
    await expect(adapter.create({ resource: 'posts', variables: {} })).rejects.toBeInstanceOf(HttpError);
    await expect(adapter.update({ resource: 'posts', id: 1, variables: {} })).rejects.toBeInstanceOf(HttpError);
    await expect(adapter.deleteOne({ resource: 'posts', id: 1 })).rejects.toBeInstanceOf(HttpError);
  });

  test('validates every optional response and marks uncertain writes', async () => {
    const adapter = createRefineAdapter({
      ...createMockRefineProvider(),
      getMany: async () => ({ data: 'not-an-array' }),
      createMany: async () => ({ data: [false] }),
      updateMany: async () => ({ data: [42] }),
      deleteMany: async () => ({ data: [null] }),
      custom: async () => ({ missingData: true }),
    });
    if (!adapter.getMany || !adapter.createMany || !adapter.updateMany || !adapter.deleteMany || !adapter.custom) {
      throw new Error('Expected optional operations');
    }
    await expect(adapter.getMany({ resource: 'posts', ids: [1] })).rejects.toBeInstanceOf(HttpError);
    await expect(adapter.createMany({ resource: 'posts', variables: [{}] })).rejects.toBeInstanceOf(HttpError);
    await expect(adapter.updateMany({ resource: 'posts', ids: [1], variables: {} })).rejects.toBeInstanceOf(HttpError);
    await expect(adapter.deleteMany({ resource: 'posts', ids: [1] })).rejects.toBeInstanceOf(HttpError);
    await expect(adapter.custom({ url: '/command', method: 'get' })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: false },
    });
    await expect(adapter.custom({ url: '/command', method: 'post' })).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE', details: { writeMayHaveSucceeded: true },
    });
  });

  test('rejects non-callable optional operations and invalid API URLs', () => {
    expect(() => createRefineAdapter({ ...createMockRefineProvider(), getMany: 'not-a-function' })).toThrow('invalid optional');
    const adapter = createRefineAdapter({ ...createMockRefineProvider(), getApiUrl: () => 42 });
    expect(() => adapter.getApiUrl()).toThrow('must return a string');
  });
});
