import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { Type } from '@sinclair/typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { defineResource } from './resource-contract';
import { useList, useOne, useCreate, useUpdate, useDelete, useCreateMany, useUpdateMany, useDeleteMany, useShow, useSelect, useInfiniteList } from './strict-hooks.svelte';
import { keys, queryKeyMatches } from './query-keys';

type Config = { queryFn?: (context?: { pageParam: number }) => Promise<unknown>; queryKey?: readonly unknown[]; mutationFn?: (params: unknown) => Promise<unknown> };
type Transport = (...params: unknown[]) => Promise<unknown>;
const state = vi.hoisted(() => {
  const factories: (() => Config)[] = [];
  return {
    factories,
    getList: vi.fn<Transport>(), getOne: vi.fn<Transport>(), create: vi.fn<Transport>(),
    update: vi.fn<Transport>(), deleteOne: vi.fn<Transport>(),
  };
});
vi.mock('./useParsed.svelte', () => ({ useParsed: () => ({ resource: 'elsewhere', parentParams: {} }) }));
vi.mock('./context.svelte', () => ({
  captureAdminContext: () => ({
    resources: ['posts', 'first', 'second'].map(name => ({ name, label: name, fields: [], provider: { dataProviderName: 'named' } })),
    providers: { named: {
      getApiUrl: () => '/api',
      getList: state.getList, getOne: state.getOne, create: state.create, update: state.update, deleteOne: state.deleteOne,
    } },
    resolveDataProviderName: () => 'named',
    getProviderMeta: () => undefined,
    getDataProviderForResource: () => ({
      getApiUrl: () => '/api',
      getList: state.getList, getOne: state.getOne, create: state.create, update: state.update, deleteOne: state.deleteOne,
    }),
    queryKeys: () => keys({ provider: 'named', tenant: 'tenant-1' }),
    queryKeyMatcher: () => ({ provider: 'named', tenant: 'tenant-1' }),
  }),
}));
vi.mock('@tanstack/svelte-query', async importOriginal => ({
  ...await importOriginal<typeof import('@tanstack/svelte-query')>(),
  useQueryClient: () => new QueryClient(),
  createQuery: (factory: () => Config) => {
    state.factories.push(factory);
    return { isLoading: false, isSuccess: false, isError: false };
  },
  createInfiniteQuery: (factory: () => Config) => {
    state.factories.push(factory);
    return { isLoading: false, isSuccess: false, isError: false };
  },
  createMutation: (factory: () => Config) => {
    state.factories.push(factory);
    return { isPending: false, mutateAsync: async (params: unknown) => {
      await Promise.resolve();
      return factory().mutationFn?.(params);
    } };
  },
}));

const record = Type.Object({ id: Type.Number(), title: Type.String() });
const posts = defineResource('posts', {
  record, create: Type.Object({ title: Type.String() }), update: Type.Object({ title: Type.String() }), delete: Type.Object({ reason: Type.String() }),
});

async function mounted<T>(hook: () => T, run: (configs: Config[], result: T) => Promise<void>) {
  let result: { value: T } | undefined;
  const cleanup = $effect.root(() => { result = { value: hook() }; });
  try {
    flushSync();
    if (!result) throw new Error('Expected a mounted hook.');
    await run(state.factories.map(factory => factory()), result.value);
  } finally { cleanup(); }
}

describe('public strict hooks enforce their actual transport boundary', () => {
  beforeEach(() => {
    state.factories.length = 0;
    state.getList.mockReset().mockResolvedValue({ data: [{ id: 1, title: 'Hello' }], total: 1 });
    state.getOne.mockReset().mockResolvedValue({ data: { id: 1, title: 'Hello' } });
    state.create.mockReset().mockResolvedValue({ data: { id: 1, title: 'Hello' } });
    state.update.mockReset().mockResolvedValue({ data: { id: 1, title: 'Hello' } });
    state.deleteOne.mockReset().mockResolvedValue({ data: { id: 1, title: 'Hello' } });
  });

  it('validates responses and retains tenant/provider cache separation', async () => {
    await mounted(() => useList({ resource: posts }), async ([config]) => {
      const key = config?.queryKey;
      expect(key).toBeDefined();
      if (!key) throw new Error('Expected a key');
      expect(queryKeyMatches(key, { resource: 'posts' })).toBe(false);
      expect(key[0]).toMatchObject({ provider: 'named', tenant: 'tenant-1', contract: expect.any(String) });
      await expect(config?.queryFn?.()).resolves.toMatchObject({ total: 1 });
      state.getList.mockResolvedValue({ data: [{ id: 1, title: 2 }], total: 1 });
      await expect(config?.queryFn?.()).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    });
  });

  it('keeps an in-flight query bound to its original resource schema', async () => {
    const first = defineResource('first', { record: Type.Object({ id: Type.Number(), title: Type.String({ pattern: '^first$' }) }) });
    const second = defineResource('second', { record: Type.Object({ id: Type.Number(), title: Type.String({ pattern: '^second$' }) }) });
    let resource = $state(first);
    await mounted(() => useList(() => ({ resource })), async ([original]) => {
      let complete: (value: unknown) => void = () => { throw new Error('Request was not started'); };
      state.getList.mockImplementationOnce(() => new Promise<unknown>(resolve => { complete = resolve; }));
      const pending = original?.queryFn?.();
      resource = second;
      flushSync();
      const next = state.factories[0]?.();
      complete({ data: [{ id: 1, title: 'first' }], total: 1 });
      await expect(pending).resolves.toMatchObject({ data: [{ title: 'first' }] });
      state.getList.mockResolvedValue({ data: [{ id: 1, title: 'first' }], total: 1 });
      await expect(next?.queryFn?.()).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
      state.getList.mockResolvedValue({ data: [{ id: 2, title: 'second' }], total: 1 });
      await expect(next?.queryFn?.()).resolves.toMatchObject({ data: [{ title: 'second' }] });
    });
  });

  it('marks a malformed write response as potentially committed', async () => {
    await mounted(() => useCreate({ resource: posts }), async (_configs, { mutation }) => {
      state.create.mockResolvedValue({ data: { id: 1, title: false } });
      await expect(mutation.mutateAsync({ variables: { title: 'Hello' } })).rejects.toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE',
        details: { phase: 'response', writeMayHaveSucceeded: true },
      });
    });
  });

  it('rejects raw resource strings at construction even for JavaScript callers', () => {
    const cleanup = $effect.root(() => {
      expect(() => Reflect.apply(useCreate, undefined, [{ resource: 'posts' }])).toThrow();
    });
    cleanup();
  });

  it('validates IDs at the query boundary', async () => {
    await mounted((): unknown => Reflect.apply(useOne, undefined, [{ resource: posts, id: '1' }]), async ([config]) => {
      await expect(config?.queryFn?.()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
      expect(state.getOne).not.toHaveBeenCalled();
    });
  });

  it('guards show state setters before invalid IDs enter state', () => {
    const cleanup = $effect.root(() => {
      const show = useShow({ resource: posts, id: 1 });
      expect(() => Reflect.apply(show.setShowId, show, ['bad'])).toThrow();
      show.setShowId(2);
      expect(show.showId).toBe(2);
    });
    cleanup();
  });

  it('checks a complete create fallback batch before dispatch', async () => {
    await mounted(() => useCreateMany({ resource: posts }), async (_configs, result) => {
      await expect(Reflect.apply(result.mutation.mutateAsync, undefined, [
        { variables: [{ title: 'Hello' }, { title: 2 }] },
      ])).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
      expect(state.create).not.toHaveBeenCalled();
      await expect(result.mutation.mutateAsync({ variables: [{ title: 'Hello' }] })).resolves.toMatchObject({ data: [{ id: 1 }] });
    });
  });

  it('rejects attempts to override a bound single-record write', async () => {
    for (const hook of [
      () => useCreate({ resource: posts }),
      () => useUpdate({ resource: posts, id: 1 }),
      () => useDelete({ resource: posts, id: 1 }),
    ]) {
      state.factories.length = 0;
      await mounted(() => hook(), async (_configs, { mutation }) => {
        for (const override of [{ id: 2 }, { resource: 'users' }, { mutationMode: 'optimistic' }, { invalidates: false }]) {
          const result: unknown = Reflect.apply(mutation.mutateAsync, mutation, [{ variables: { title: 'Hello' }, ...override }]);
          await expect(result)
            .rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
        }
      });
    }
    expect(state.create).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
    expect(state.deleteOne).not.toHaveBeenCalled();
  });

  it('rejects batch overrides and wrong envelopes before dispatch', async () => {
    for (const hook of [
      () => useCreateMany({ resource: posts }),
      () => useUpdateMany({ resource: posts }),
      () => useDeleteMany({ resource: posts }),
    ]) {
      state.factories.length = 0;
      await mounted(() => hook(), async (_configs, { mutation }) => {
        for (const params of [null, { resource: 'users', ids: [1], variables: {} }, { ids: [1], variables: {}, meta: [] }]) {
          const result: unknown = Reflect.apply(mutation.mutateAsync, mutation, [params]);
          await expect(result).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
        }
      });
    }
    expect(state.create).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
    expect(state.deleteOne).not.toHaveBeenCalled();
  });

  it('checks required deletion variables and all IDs before a fallback batch', async () => {
    await mounted(() => useDeleteMany({ resource: posts }), async (_configs, { mutation }) => {
      const missing: unknown = Reflect.apply(mutation.mutateAsync, mutation, [{ ids: [1] }]);
      await expect(missing).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
      const wrongIds: unknown = Reflect.apply(mutation.mutateAsync, mutation, [{ ids: [1, 'bad'], variables: { reason: 'duplicate' } }]);
      await expect(wrongIds).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
      expect(state.deleteOne).not.toHaveBeenCalled();
      await mutation.mutateAsync({ ids: [1], variables: { reason: 'duplicate' } });
      expect(state.deleteOne).toHaveBeenCalledWith(expect.objectContaining({ id: 1, variables: { reason: 'duplicate' } }));
    });
  });

  it('does not let select queries or default records skip response validation', async () => {
    await mounted(() => useSelect({ resource: posts, optionLabel: 'title', optionValue: 'id', defaultValue: [1] }), async configs => {
      expect(configs).toHaveLength(2);
      state.getOne.mockResolvedValue({ data: { id: 'bad', title: 'Hello' } });
      await expect(configs[1]?.queryFn?.()).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    });
  });

  it('binds infinite queries to the same response validator', async () => {
    await mounted(() => useInfiniteList({ resource: posts }), async ([config]) => {
      state.getList.mockResolvedValue({ data: [{ id: 1, title: false }], total: 1 });
      await expect(config?.queryFn?.({ pageParam: 1 })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    });
  });
});
