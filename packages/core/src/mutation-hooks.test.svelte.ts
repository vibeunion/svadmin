/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { useCreate, useUpdate, invalidateByScopes } from './mutation-hooks.svelte';
import { flushSync } from 'svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { keys } from './query-keys';

vi.mock('./context.svelte', () => {
  const dataProvider = {
    getOne: vi.fn(),
    getList: vi.fn(),
    create: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    update: vi.fn().mockResolvedValue({ data: { id: 1 } })
  };
  const getResource = (name: string) => ({ name, primaryKey: 'id' });
  return {
    captureAdminContext: () => ({
      providers: { default: dataProvider },
      authProvider: null,
      resources: [getResource('posts')],
      routerProvider: undefined,
      liveProvider: undefined,
      taskProvider: undefined,
      getDataProvider: () => dataProvider,
      getDataProviderNames: () => ['default'],
      getDataProviderForResource: () => dataProvider,
      queryKeyMatcher: (resource: string, provider?: string) => ({
        provider: provider ?? 'default',
        tenant: undefined,
        resource,
      }),
      getResource,
      currentPath: () => '/posts',
      formatLink: (path: string) => path,
      navigate: vi.fn(async () => {}),
      back: vi.fn(),
    }),
    useDataProvider: () => dataProvider,
    useResource: () => ({ name: 'posts' }),
    getResource,
    useRouterContext: () => ({ navigate: vi.fn() }),
    useTranslate: () => (key: string) => key,
    useNotification: () => ({ open: vi.fn(), close: vi.fn() }),
    getLiveProvider: () => undefined
  };
});

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    useQueryClient: () => new QueryClient(),
    createMutation: (opts: any) => ({
      mutate: vi.fn((vars, callbacks) => {
        if (opts.mutationFn) opts.mutationFn(vars);
        if (callbacks?.onSuccess) callbacks.onSuccess({ data: {} });
      }),
      isPending: false
    })
  };
});

describe('useCreate & useUpdate - Headless Svelte 5 Compatibility', () => {

  it('safely binds useCreate and allows mutations over proxies', () => {
    let createMutation: ReturnType<typeof useCreate>;
    
    const cleanup = $effect.root(() => {
        createMutation = useCreate();
    });

    flushSync();
    
    expect(createMutation!.mutation.mutate).toBeDefined();
    expect(createMutation!.mutation.isPending).toBe(false);

    cleanup();
  });

  it('safely binds useUpdate and evaluates data updates', () => {
    let updateMutation: ReturnType<typeof useUpdate>;
    
    const cleanup = $effect.root(() => {
        updateMutation = useUpdate();
    });

    flushSync();
    
    expect(updateMutation!.mutation.mutate).toBeDefined();
    expect(updateMutation!.mutation.isPending).toBe(false);

    cleanup();
  });
});
describe('mutation-hooks', () => {

  describe('invalidateByScopes - Multi-Provider Cache Isolation', () => {
    it('filters perfectly by dataProviderName when passed', () => {
      const queryClient = new QueryClient();
      queryClient.invalidateQueries = vi.fn(async () => {});

      const resource = 'posts';
      const providerName = 'secondaryProvider';
      
      // Act
      invalidateByScopes({
        queryClient,
        resource,
        scopes: ['list'],
        defaults: ['list'],
        matcher: { provider: providerName, tenant: undefined },
      });
      
      expect(queryClient.invalidateQueries).toHaveBeenCalled();
      
      // Assert predicate captures DataProvider scopes
      const calls = (queryClient.invalidateQueries as ReturnType<typeof vi.fn>).mock.calls;
      
      // Using arbitrary mock objects simulating Query keys
      const predicateFn = calls[0][0].predicate;
      
      const shouldPass = predicateFn({ queryKey: keys({ provider: 'secondaryProvider' }).data.list('posts') });
      const shouldFail = predicateFn({ queryKey: keys({ provider: 'default' }).data.list('posts') });
      const shouldFailResource = predicateFn({ queryKey: keys({ provider: 'secondaryProvider' }).data.list('users') });

      expect(shouldPass).toBe(true);
      expect(shouldFail).toBe(false);
      expect(shouldFailResource).toBe(false);
    });
    
    it('uses the resolved default provider when no override is specified', () => {
      const queryClient = new QueryClient();
      queryClient.invalidateQueries = vi.fn(async () => {});

      // Act without providerName
      invalidateByScopes({
        queryClient,
        resource: 'posts',
        scopes: ['list'],
        defaults: ['list'],
        matcher: { provider: 'default', tenant: undefined },
      });
      
      const predicateFn = (queryClient.invalidateQueries as ReturnType<typeof vi.fn>).mock.calls[0][0].predicate;
      
      const pass1 = predicateFn({ queryKey: keys().data.list('posts') });
      const pass2 = predicateFn({ queryKey: keys({ provider: 'custom' }).data.list('posts') });
      expect(pass1).toBe(true);
      expect(pass2).toBe(false);
    });

    it('isolates invalidation by provider and tenant', () => {
      const queryClient = new QueryClient();
      queryClient.invalidateQueries = vi.fn(async () => {});

      invalidateByScopes({
        queryClient,
        resource: 'posts',
        scopes: ['resourceAll'],
        defaults: ['resourceAll'],
        matcher: { provider: 'cms', tenant: 'tenant-a' },
      });

      const predicate = (queryClient.invalidateQueries as ReturnType<typeof vi.fn>).mock.calls[0][0].predicate;
      expect(predicate({ queryKey: keys({ provider: 'cms', tenant: 'tenant-a' }).data.list('posts') })).toBe(true);
      expect(predicate({ queryKey: keys({ provider: 'cms', tenant: 'tenant-b' }).data.list('posts') })).toBe(false);
      expect(predicate({ queryKey: keys({ provider: 'default', tenant: 'tenant-a' }).data.list('posts') })).toBe(false);
    });
  });

});
