import { afterEach, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import {
  attachSvadminDevtoolsQueryClient,
  createSvadminDevtoolsCacheActions,
  getSvadminDevtoolsSnapshot,
  publishSvadminDevtoolsSnapshot,
  subscribeSvadminDevtools,
} from './devtools-bridge.js';
import type { SvadminDevtoolsSnapshot } from './devtools-bridge.js';

const snapshot: SvadminDevtoolsSnapshot = {
  version: 1 as const,
  environment: 'development' as const,
  route: '/users',
  locale: 'en',
  theme: 'light',
  colorTheme: 'blue',
  resourceCount: 1,
  providers: [],
  cache: {
    queries: { total: 1, fetching: 0, stale: 0, errors: 0 },
    mutations: { total: 0, pending: 0, paused: 0, errors: 0 },
  },
  queries: [],
};

afterEach(() => {
  const unsubscribe = subscribeSvadminDevtools(() => {});
  unsubscribe();
});

describe('svadmin DevTools bridge', () => {
  it('publishes a machine-readable snapshot to subscribers', () => {
    const received: typeof snapshot[] = [];
    const unsubscribe = subscribeSvadminDevtools((next) => received.push(next));

    publishSvadminDevtoolsSnapshot(snapshot);

    expect(getSvadminDevtoolsSnapshot()).toEqual(snapshot);
    expect(received).toEqual([snapshot]);
    unsubscribe();
  });

  it('immediately sends the latest snapshot to a new subscriber', () => {
    publishSvadminDevtoolsSnapshot(snapshot);
    const received: typeof snapshot[] = [];

    const unsubscribe = subscribeSvadminDevtools((next) => received.push(next));

    expect(received).toEqual([snapshot]);
    unsubscribe();
  });

  it('mutates only matching svadmin query keys', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      [{ namespace: 'svadmin', version: 2, provider: 'default', kind: 'data', action: 'list', resource: 'users' }],
      { data: ['users'] },
    );
    queryClient.setQueryData(
      [{ namespace: 'svadmin', version: 2, provider: 'default', kind: 'data', action: 'list', resource: 'orders' }],
      { data: ['orders'] },
    );
    attachSvadminDevtoolsQueryClient(queryClient);

    const actions = createSvadminDevtoolsCacheActions();
    actions.remove({ provider: 'default', resource: 'users', operation: 'data:list' });

    expect(queryClient.getQueryCache().findAll()).toHaveLength(1);
    expect(queryClient.getQueryCache().findAll()[0]?.queryKey).toEqual([
      { namespace: 'svadmin', version: 2, provider: 'default', kind: 'data', action: 'list', resource: 'orders' },
    ]);
  });
});
