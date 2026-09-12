import { describe, expect, it } from 'bun:test';
import { withProviderMeta, type ProviderMetaInput } from './provider-bundle';
import type { DataProvider } from './types';

describe('provider metadata replacement', () => {
  it('clears original metadata when the resolver returns undefined for every operation', async () => {
    const calls: ProviderMetaInput[] = [];
    const stop = new Error('recorded');
    function record(params: ProviderMetaInput): never {
      calls.push(params);
      throw stop;
    }
    const original: DataProvider = {
      getList: async (params) => record(params),
      getOne: async (params) => record(params),
      getMany: async (params) => record(params),
      create: async (params) => record(params),
      createMany: async (params) => record(params),
      update: async (params) => record(params),
      updateMany: async (params) => record(params),
      deleteOne: async (params) => record(params),
      deleteMany: async (params) => record(params),
      custom: async (params) => record(params),
      getApiUrl: () => '/api',
    };
    const provider = withProviderMeta(original, () => undefined);
    const input = { resource: 'posts', meta: { old: true } };
    const operations = [
      () => provider.getList(input),
      () => provider.getOne({ ...input, id: 1 }),
      () => provider.getMany?.({ ...input, ids: [1] }),
      () => provider.create({ ...input, variables: { title: 'new' } }),
      () => provider.createMany?.({ ...input, variables: [{ title: 'new' }] }),
      () => provider.update({ ...input, id: 1, variables: { title: 'new' } }),
      () => provider.updateMany?.({ ...input, ids: [1], variables: { title: 'new' } }),
      () => provider.deleteOne({ ...input, id: 1 }),
      () => provider.deleteMany?.({ ...input, ids: [1] }),
      () => provider.custom?.({ url: '/health', method: 'get', meta: input.meta }),
    ];
    for (const operation of operations) {
      const pending: Promise<unknown> | undefined = operation();
      if (!pending) throw new Error('Expected the adapted operation to exist');
      await expect(pending).rejects.toBe(stop);
    }

    expect(calls).toHaveLength(10);
    for (const call of calls) expect(Object.hasOwn(call, 'meta')).toBe(false);
    const expectedCreateParams = { resource: 'posts', variables: { title: 'new' } };
    expect(calls[3]).toEqual(expectedCreateParams);
    expect(input.meta).toEqual({ old: true });
  });

  it('retains required arguments and replaces metadata without changing the input', async () => {
    const calls: ProviderMetaInput[] = [];
    const stop = new Error('unused operation');
    const original: DataProvider = {
      getList: async (params) => {
        calls.push(params);
        return { data: [], total: 0 };
      },
      getOne: async () => { throw stop; },
      create: async () => { throw stop; },
      update: async () => { throw stop; },
      deleteOne: async () => { throw stop; },
      getApiUrl: () => '/api',
    };
    const metadata = { tenantId: 'alpha' };
    const provider = withProviderMeta(original, () => metadata);
    const input = { resource: 'posts', meta: { tenantId: 'spoofed' } };

    await provider.getList(input);

    expect(calls).toEqual([{ resource: 'posts', meta: metadata }]);
    expect(calls[0]?.meta).toBe(metadata);
    expect(input.meta.tenantId).toBe('spoofed');
    expect(provider.getApiUrl()).toBe('/api');
  });
});
