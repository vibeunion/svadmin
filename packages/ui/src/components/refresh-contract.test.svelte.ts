import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import { defineResource, resetContext, keys, parseQueryKey, type DataProvider, type GetListResult, type ResourceDefinition } from '@svadmin/core';
import { definedOptions } from '@svadmin/core/options';
import { contractKey } from '../../../core/src/resource-contract';
import { snapshotInvalidationParams } from '../../../core/src/invalidation-contract';
import type { RefreshState } from './refresh-contract.test.types';
import Host from './refresh-contract.test-host.svelte';

const posts = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const other = defineResource('other', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const postDefinition: ResourceDefinition = { name: 'posts', label: 'Posts', fields: [], contract: posts };
const resources: ResourceDefinition[] = [postDefinition, { name: 'other', label: 'Other', fields: [], contract: other }];
const clients: QueryClient[] = [];
const row = { id: 1, title: 'Initial' };

function provider(getList: DataProvider['getList'] = async () => ({ data: [row], total: 1 })): DataProvider {
  return {
    getList, getApiUrl: () => '/api',
    getOne: async () => ({ data: {} }), create: async () => ({ data: {} }),
    update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
  };
}

function deferred<T = void>() {
  let resolve: (value: T) => void = () => { throw new Error('Request not initialized'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function mount(source: DataProvider | Record<string, DataProvider> = provider(), activeQuery = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  let state: RefreshState | undefined;
  const view = render(Host, { provider: source, resources, queryClient: client, activeQuery, onReady: value => { state = value; } });
  return {
    client, view,
    read() {
      if (!state) throw new Error('Expected a mounted refresh hook');
      return state;
    },
  };
}

function scopeOf(client: QueryClient) {
  const descriptor = client.getQueryCache().getAll().map(query => parseQueryKey(query.queryKey))
    .find(key => key?.kind === 'data' && key.resource === 'posts');
  if (!descriptor) throw new Error('Expected a scoped query');
  return definedOptions({ provider: descriptor.provider, tenant: descriptor.tenant, contract: descriptor.contract });
}

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  vi.restoreAllMocks();
});

describe('contract-bound refresh', () => {
  it('refreshes the actual validated list and remains busy until its response arrives', async () => {
    const pending = deferred<GetListResult>();
    const getList = vi.fn<DataProvider['getList']>()
      .mockResolvedValueOnce({ data: [row], total: 1 }).mockImplementationOnce(() => pending.promise);
    const app = mount(provider(getList));
    await waitFor(() => expect(app.view.getByTestId('row').textContent).toBe('Initial'));
    const button = app.view.getByRole('button');
    await fireEvent.click(button);
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    await fireEvent.click(button);
    expect(getList).toHaveBeenCalledTimes(2);
    pending.resolve({ data: [{ id: 1, title: 'Refreshed' }], total: 1 });
    await waitFor(() => expect(app.view.getByTestId('row').textContent).toBe('Refreshed'));
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
    expect(app.view.queryByRole('alert')).toBeNull();
  });

  it('selects list families and many caches only in the current contract, tenant and named provider', async () => {
    const source = provider();
    const app = mount({ default: source, cms: source }, false);
    await app.view.rerender({ resources: [{ ...postDefinition, provider: { dataProviderName: 'cms' } }] });
    const descriptor = app.client.getQueryCache().getAll().map(query => parseQueryKey(query.queryKey))
      .find(key => key?.provider === 'cms');
    if (!descriptor) throw new Error('Expected the named provider query');
    const scope = definedOptions({ provider: descriptor.provider, tenant: descriptor.tenant, contract: descriptor.contract });
    const sourceId: unknown = typeof descriptor.params === 'object' && descriptor.params !== null
      ? Object.getOwnPropertyDescriptor(descriptor.params, 'source')?.value : undefined;
    if (typeof sourceId !== 'string') throw new Error('Expected a provider source');
    const current = keys(scope);
    const selected = [
      current.data.list('posts'), current.data.infiniteList('posts', { source: sourceId, fixture: true }),
      current.data.select('posts'), current.data.selectDefaults('posts'), current.data.many('posts', [1]),
    ];
    const excluded = [
      current.data.one('posts', 1), current.data.list('other'),
      keys({ ...scope, provider: 'default' }).data.list('posts'),
      keys({ ...scope, tenant: 'another-tenant' }).data.list('posts'),
      keys({ ...scope, contract: contractKey(other) }).data.list('posts'),
      keys(definedOptions({ provider: scope.provider, tenant: scope.tenant })).data.list('posts'),
      current.data.infiniteList('posts', { source: 'another-instance' }),
      current.data.infiniteList('posts', { fixture: true }),
      current.access.can('posts'), current.custom.call('posts', 1), current.task.list(),
      ['default', 'posts', 'list'],
    ];
    for (const key of [...selected, ...excluded]) app.client.setQueryData(key, { fixture: true });
    await app.read().invalidate({ invalidates: ['list', 'many'] });
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of excluded) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it('does not refresh another provider instance sharing the same client, resource, tenant and provider name', async () => {
    const first = vi.fn<DataProvider['getList']>(async () => ({ data: [{ id: 1, title: 'First provider' }], total: 1 }));
    const second = vi.fn<DataProvider['getList']>(async () => ({ data: [{ id: 1, title: 'Second provider' }], total: 1 }));
    const app = mount(provider(first));
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    let secondState: RefreshState | undefined;
    render(Host, { provider: provider(second), resources, queryClient: app.client, onReady: value => { secondState = value; } });
    await waitFor(() => expect(secondState?.query.isSuccess).toBe(true));
    const button = within(app.view.container).getByRole('button');
    await fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('false'));
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('validates detail IDs against the contract and matches number and string IDs separately', async () => {
    const app = mount(provider(), false);
    const builder = keys(scopeOf(app.client));
    const one = builder.data.one('posts', 1);
    const second = builder.data.one('posts', 2);
    const textId = builder.data.one('posts', '1');
    for (const key of [one, second, textId]) app.client.setQueryData(key, { data: row });
    await expect(app.read().invalidate({ invalidates: ['detail'], id: '1' })).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(app.client.getQueryState(one)?.isInvalidated).toBe(false);
    await app.read().invalidate({ invalidates: ['detail'], id: 1 });
    expect(app.client.getQueryState(one)?.isInvalidated).toBe(true);
    expect(app.client.getQueryState(second)?.isInvalidated).toBe(false);
    expect(app.client.getQueryState(textId)?.isInvalidated).toBe(false);
  });

  it.each([undefined, 'all', ['resourceAll']] as const)('keeps the broad refresh mode %j inside the bound data resource', async mode => {
    const app = mount(provider(), false);
    const builder = keys(scopeOf(app.client));
    const selected = [builder.data.list('posts'), builder.data.one('posts', 1), builder.data.many('posts', [1])];
    const excluded = [builder.data.list('other'), builder.access.can('posts'), builder.custom.call('posts', 1), builder.task.list()];
    for (const key of [...selected, ...excluded]) app.client.setQueryData(key, { fixture: true });
    if (mode === undefined) await app.read().invalidate();
    else await app.read().invalidate({ invalidates: typeof mode === 'string' ? mode : [...mode] });
    for (const key of selected) expect(app.client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of excluded) expect(app.client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it('treats explicit empty scopes and false as no-ops rather than expanding them', async () => {
    const app = mount(provider(), false);
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    await app.read().invalidate({ invalidates: [] });
    await app.read().invalidate({ invalidates: false });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('rejects unexpected scopes and properties without broadening the cache operation', async () => {
    const app = mount(provider(), false);
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    for (const value of [['invalid'], ['all'], 'list', null, true]) {
      const input: Parameters<RefreshState['invalidate']>[0] = {};
      Reflect.set(input, 'invalidates', value);
      await expect(app.read().invalidate(input)).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    }
    const input: Parameters<RefreshState['invalidate']>[0] = {};
    Reflect.set(input, 'resource', 'other');
    await expect(app.read().invalidate(input)).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('rejects accessor-backed input without executing it', async () => {
    const app = mount(provider(), false);
    const getter = vi.fn(() => ['resourceAll']);
    const input = Object.defineProperty({}, 'invalidates', { enumerable: true, get: getter });
    await expect(app.read().invalidate(input)).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(getter).not.toHaveBeenCalled();
    expect(() => snapshotInvalidationParams({ id: Infinity })).toThrowError(expect.objectContaining({ code: 'INVALID_RESOURCE_INPUT' }));
  });

  it('refuses an absent explicit provider rather than refreshing default caches', async () => {
    const app = mount(provider(), false);
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    await app.view.rerender({ providerOverride: 'absent' });
    await expect(app.read().invalidate()).rejects.toMatchObject({ code: 'DATA_PROVIDER_REQUIRED' });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('requires a genuine metadata contract before mounting the refresh action', () => {
    const app = mount(provider(), false);
    const invalidate = vi.spyOn(app.client, 'invalidateQueries');
    const options = { name: 'posts', label: 'Posts', fields: [] };
    expect(() => render(Host, {
      provider: provider(), resources: [options], queryClient: app.client, activeQuery: false, onReady: () => {},
    })).toThrowError(expect.objectContaining({ code: 'RESOURCE_CONTRACT_REQUIRED' }));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('waits for every selected refresh operation before reporting a sanitized failure', async () => {
    const app = mount(provider(), false);
    app.client.setQueryData(keys(scopeOf(app.client)).data.many('posts', [1]), { data: [row] });
    const slow = deferred();
    vi.spyOn(app.client, 'invalidateQueries')
      .mockRejectedValueOnce({ privateValue: 'secret' })
      .mockImplementationOnce(() => slow.promise);
    let settled = false;
    const refresh = app.read().invalidate({ invalidates: ['list', 'many'] })
      .finally(() => { settled = true; }).catch((error: unknown) => error);
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    slow.resolve();
    await expect(refresh).resolves.toMatchObject({ code: 'REFRESH_FAILED', message: 'Refresh failed' });
    expect(settled).toBe(true);
  });

  it('waits for every active query within a list scope even when one query fails early', async () => {
    const app = mount(provider(), false);
    const builder = keys(scopeOf(app.client));
    const first = deferred<GetListResult>();
    const slow = deferred<GetListResult>();
    const firstKey = builder.data.list('posts', { filter: 'first' });
    const slowKey = builder.data.list('posts', { filter: 'slow' });
    const firstObserver = new QueryObserver(app.client, {
      queryKey: firstKey, initialData: { data: [row], total: 1 }, staleTime: Infinity,
      queryFn: () => first.promise,
    });
    const slowObserver = new QueryObserver(app.client, {
      queryKey: slowKey, initialData: { data: [row], total: 1 }, staleTime: Infinity,
      queryFn: () => slow.promise,
    });
    const unsubscribeFirst = firstObserver.subscribe(() => {});
    const unsubscribeSlow = slowObserver.subscribe(() => {});
    try {
      let settled = false;
      const refresh = app.read().invalidate({ invalidates: ['list', 'resourceAll'] })
        .finally(() => { settled = true; }).catch((error: unknown) => error);
      first.reject(new Error('private first failure'));
      await waitFor(() => expect(app.client.getQueryState(firstKey)?.fetchStatus).toBe('idle'));
      expect(app.client.getQueryState(slowKey)?.fetchStatus).toBe('fetching');
      expect(settled).toBe(false);
      slow.resolve({ data: [row], total: 1 });
      await expect(refresh).resolves.toMatchObject({ code: 'REFRESH_FAILED' });
      expect(app.client.getQueryState(slowKey)?.fetchStatus).toBe('idle');
    } finally {
      unsubscribeFirst();
      unsubscribeSlow();
    }
  });

  it('shows a failed refresh without accepting the malformed records and allows retry', async () => {
    const getList = vi.fn<DataProvider['getList']>()
      .mockResolvedValueOnce({ data: [row], total: 1 })
      .mockResolvedValueOnce({ data: [{ id: 1, title: false }], total: 1 })
      .mockResolvedValue({ data: [{ id: 1, title: 'Recovered' }], total: 1 });
    const app = mount(provider(getList));
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    const button = app.view.getByRole('button');
    await fireEvent.click(button);
    await waitFor(() => expect(app.view.getByRole('alert')).toBeTruthy());
    expect(app.view.getByTestId('row').textContent).toBe('Initial');
    expect(button.hasAttribute('disabled')).toBe(false);
    await fireEvent.click(button);
    await waitFor(() => expect(app.view.getByTestId('row').textContent).toBe('Recovered'));
    expect(app.view.queryByRole('alert')).toBeNull();
  });

  it.each(['resource', 'tenant', 'provider', 'contract', 'metadata'] as const)(
    'does not let a late failure overwrite the next refresh after a %s change', async change => {
      const old = deferred<GetListResult>();
      const next = deferred<GetListResult>();
      const getList = vi.fn<DataProvider['getList']>()
        .mockResolvedValueOnce({ data: [row], total: 1 })
        .mockImplementationOnce(() => old.promise)
        .mockResolvedValueOnce({ data: [{ id: 1, title: 'Current' }], total: 1 })
        .mockImplementationOnce(() => next.promise);
      const app = mount(provider(getList));
      await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
      const button = app.view.getByRole('button');
      await fireEvent.click(button);
      expect(getList).toHaveBeenCalledTimes(2);
      switch (change) {
        case 'resource': await app.view.rerender({ resource: 'other' }); break;
        case 'tenant': await app.view.rerender({ tenant: 'second' }); break;
        case 'provider': await app.view.rerender({ provider: provider(getList) }); break;
        case 'contract': await app.view.rerender({ resources: [{
          ...postDefinition, contract: defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) }),
        }] }); break;
        case 'metadata': await app.view.rerender({ resources: [{ ...postDefinition, provider: { meta: { region: 'second' } } }] }); break;
      }
      await waitFor(() => expect(app.view.getByTestId('row').textContent).toBe('Current'));
      expect(button.hasAttribute('disabled')).toBe(false);
      await fireEvent.click(button);
      expect(getList).toHaveBeenCalledTimes(4);
      old.reject(new Error('private old failure'));
      await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('true'));
      expect(app.view.queryByRole('alert')).toBeNull();
      next.resolve({ data: [{ id: 1, title: 'Finished' }], total: 1 });
      await waitFor(() => expect(app.view.getByTestId('row').textContent).toBe('Finished'));
      await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
      expect(app.view.queryByRole('alert')).toBeNull();
    },
  );

  it('settles a refresh after unmount without leaving an unhandled error', async () => {
    const pending = deferred<GetListResult>();
    const getList = vi.fn<DataProvider['getList']>()
      .mockResolvedValueOnce({ data: [row], total: 1 }).mockImplementationOnce(() => pending.promise);
    const app = mount(provider(getList));
    await waitFor(() => expect(app.read().query.isSuccess).toBe(true));
    await fireEvent.click(app.view.getByRole('button'));
    app.view.unmount();
    pending.reject(new Error('late private failure'));
    await pending.promise.catch(() => {});
  });
});
