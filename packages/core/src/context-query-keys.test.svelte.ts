import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTenantCacheKey } from './provider-bundle';
import { captureAdminContext, resetContext, setDataProvider, setResources } from './context.svelte';
import type { DataProvider } from './types';

function makeProvider(): DataProvider {
  return {
    getList: async () => ({
      data: [{ id: 1 }],
      total: 1,
    }),
    getOne: async () => ({
      data: { id: 1 },
    }),
    create: async () => ({
      data: { id: 1 },
    }),
    update: async () => ({
      data: { id: 1 },
    }),
    deleteOne: async () => ({
      data: { id: 1 },
    }),
    getApiUrl: () => '/api',
  } as DataProvider;
}

describe('AdminContextAccessor provider resolution and queryKeys', () => {
  beforeEach(() => {
    setDataProvider({
      default: makeProvider(),
      p1: makeProvider(),
      p2: makeProvider(),
    });
    setResources([
      {
        name: 'posts',
        label: 'Posts',
        fields: [],
        provider: { dataProviderName: 'p1' },
        meta: {},
      },
      {
        name: 'comments',
        label: 'Comments',
        fields: [],
        provider: {},
        meta: { dataProviderName: 'p2' },
      },
      {
        name: 'tags',
        label: 'Tags',
        fields: [],
      },
    ]);
  });

  afterEach(() => {
    resetContext();
  });

  it('uses valid override first', () => {
    const adminContext = captureAdminContext();
    expect(adminContext.resolveDataProviderName('posts', 'p2')).toBe('p2');
    expect(adminContext.queryKeys('posts', 'p2').data.list('posts')[0].provider).toBe('p2');
    expect(adminContext.queryKeyMatcher('posts', 'p2')).toEqual({ provider: 'p2', tenant: undefined });
  });

  it('falls back to resource.provider.dataProviderName when override is invalid', () => {
    const adminContext = captureAdminContext();
    expect(adminContext.resolveDataProviderName('posts', 'not-found')).toBe('p1');
    expect(adminContext.queryKeys('posts', 'not-found').data.list('posts')[0].provider).toBe('p1');
  });

  it('falls back to resource.meta.dataProviderName when provider config missing', () => {
    const adminContext = captureAdminContext();
    expect(adminContext.resolveDataProviderName('comments', 'not-found')).toBe('p2');
    expect(adminContext.queryKeys('comments', 'not-found').data.list('comments')[0].provider).toBe('p2');
  });

  it('falls back to default provider when no resource hints exist', () => {
    const adminContext = captureAdminContext();
    expect(adminContext.resolveDataProviderName('tags', 'not-found')).toBe('default');
    expect(adminContext.queryKeys('tags', 'not-found').data.list('tags')[0].provider).toBe('default');
  });

  it('adds tenant cache key to query keys when tenant cache key exists', () => {
    const adminContext = captureAdminContext();
    const tenantKey = createTenantCacheKey({ tenantId: 'tenant-a' });
    Object.defineProperty(adminContext, 'tenantCacheKey', {
      get: () => tenantKey,
      configurable: true,
    });

    const key = adminContext.queryKeys('posts', 'p1').data.list('posts')[0];

    expect(key.provider).toBe('p1');
    expect(key.tenant).toBe(tenantKey.__svadminTenant);
    expect(adminContext.queryKeyMatcher('posts', 'p1')).toEqual({
      provider: 'p1',
      tenant: tenantKey.__svadminTenant,
    });
  });
});
