import { cleanup, render, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resolveTenantProviderMeta, setAccessControlProvider } from '@svadmin/core';
import type { BaseRecord, CanResult, DataProvider, GetListParams, GetListResult, GetOneParams, GetOneResult } from '@svadmin/core';
import { resetAccessControlProvider } from '@svadmin/core/permissions';
import { resetI18n } from '@svadmin/core/i18n';
import { DEFAULT_SURFACE_CATALOG_VERSION } from './catalog.js';
import type { SurfacePolicy, SurfaceSpec } from './types.js';
import ScopedSurfaceHarness from '../test/fixtures/ScopedSurfaceHarness.svelte';

const policy: SurfacePolicy = {
  resources: { products: { readFields: ['id', 'count'], allowGetOne: true } },
};
function specFor(kind: 'list' | 'one' = 'list'): SurfaceSpec {
  return {
    schemaVersion: 'surface/v1', catalogVersion: DEFAULT_SURFACE_CATALOG_VERSION,
    surfaceId: 'scope-review', title: 'Scoped surface', layout: { type: 'grid', columns: 12 },
    dataSources: [kind === 'one'
      ? { id: 'shared', type: 'resource-one', resource: 'products', recordId: 7 }
      : { id: 'shared', type: 'resource-list', resource: 'products' }],
    widgets: [{ id: 'count', type: 'metric', props: { label: 'Count', format: 'number' },
      binding: { sourceId: 'shared', pointer: kind === 'one' ? '/count' : '/total' } }],
  };
}
function provider(total = 510) {
  const getList = vi.fn<(params: GetListParams) => void>();
  const getOne = vi.fn<(params: GetOneParams) => void>();
  const mutation = async (): Promise<never> => { throw new Error('Unexpected write in read-only fixture'); };
  const dataProvider: DataProvider = {
    getApiUrl: () => '/api',
    async getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<TData>> {
      getList(params);
      return { data: [], total };
    },
    async getOne<TData extends BaseRecord = BaseRecord>(params: GetOneParams): Promise<GetOneResult<TData>> {
      getOne(params);
      return { data: { id: params.id, count: total } as unknown as TData };
    },
    create: mutation, update: mutation, deleteOne: mutation,
  };
  return { dataProvider, getList, getOne };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
async function settle() {
  for (let index = 0; index < 4; index++) await tick();
}
afterEach(() => {
  cleanup();
  resetAccessControlProvider();
  resetI18n();
});

describe('SurfaceRenderer owning permission scope', () => {
  test.each(['list', 'one'] as const)('scoped denial blocks %s reads even when the global provider allows', async (kind) => {
    const globalCan = vi.fn(async () => ({ can: true }));
    setAccessControlProvider({ can: globalCan });
    const h = provider();
    const can = vi.fn(async () => ({ can: false, reason: 'Scoped read denied' }));
    const view = render(ScopedSurfaceHarness, { dataProvider: h.dataProvider, accessControlProvider: { can }, spec: specFor(kind), policy });
    expect((await within(view.container).findByRole('alert')).textContent).toContain('Scoped read denied');
    expect(can).toHaveBeenCalledTimes(1);
    expect(can).toHaveBeenCalledWith({ resource: 'products', action: kind === 'one' ? 'show' : 'list',
      meta: resolveTenantProviderMeta({ tenantId: 'alpha' }) });
    expect(h.getList).not.toHaveBeenCalled();
    expect(h.getOne).not.toHaveBeenCalled();
    expect(globalCan).not.toHaveBeenCalled();
  });

  test('scoped allow and explicit scoped null do not inherit a global deny', async () => {
    const globalCan = vi.fn(async () => ({ can: false, reason: 'Global only' }));
    setAccessControlProvider({ can: globalCan });
    for (const accessControlProvider of [null, { can: vi.fn(async () => ({ can: true })) }]) {
      const h = provider();
      const view = render(ScopedSurfaceHarness, { dataProvider: h.dataProvider, accessControlProvider, spec: specFor(), policy });
      await within(view.container).findByText('510');
      expect(h.getList).toHaveBeenCalledTimes(1);
      view.unmount();
    }
    expect(globalCan).not.toHaveBeenCalled();
  });

  test('two live trees with identical source IDs keep opposite permission decisions isolated', async () => {
    const allowed = provider(610);
    const denied = provider(710);
    const allow = vi.fn(async () => ({ can: true }));
    const deny = vi.fn(async () => ({ can: false, reason: 'Other tree denied' }));
    const first = render(ScopedSurfaceHarness, { dataProvider: allowed.dataProvider, accessControlProvider: { can: allow }, spec: specFor(), policy });
    const second = render(ScopedSurfaceHarness, { dataProvider: denied.dataProvider, accessControlProvider: { can: deny }, spec: specFor(), policy });
    await within(first.container).findByText('610');
    await within(second.container).findByRole('alert');
    expect(allowed.getList).toHaveBeenCalledTimes(1);
    expect(denied.getList).not.toHaveBeenCalled();
    expect(within(second.container).queryByText('610')).toBeNull();
    expect(allow).toHaveBeenCalledTimes(1);
    expect(deny).toHaveBeenCalledTimes(1);
  });

  test('unrelated global registrations do not invalidate a scoped ready result', async () => {
    const h = provider();
    const can = vi.fn(async () => ({ can: true }));
    const view = render(ScopedSurfaceHarness, { dataProvider: h.dataProvider, accessControlProvider: { can }, spec: specFor(), policy });
    await within(view.container).findByText('510');
    const globalCan = vi.fn(async () => ({ can: false }));
    setAccessControlProvider({ can: globalCan });
    await settle();
    expect(within(view.container).getByText('510')).not.toBeNull();
    expect(h.getList).toHaveBeenCalledTimes(1);
    expect(can).toHaveBeenCalledTimes(1);
    expect(globalCan).not.toHaveBeenCalled();
  });

  test('replacing the owning permission provider clears ready data on denial', async () => {
    const h = provider();
    const view = render(ScopedSurfaceHarness, { dataProvider: h.dataProvider,
      accessControlProvider: { can: async () => ({ can: true }) }, spec: specFor(), policy });
    await within(view.container).findByText('510');
    const deny = vi.fn(async () => ({ can: false, reason: 'Revoked locally' }));
    await view.rerender({ accessControlProvider: { can: deny } });
    expect((await within(view.container).findByRole('alert')).textContent).toContain('Revoked locally');
    expect(within(view.container).queryByText('510')).toBeNull();
    expect(h.getList).toHaveBeenCalledTimes(1);
    expect(deny).toHaveBeenCalledTimes(1);
  });

  test('an obsolete scoped permission result cannot start a read after replacement', async () => {
    const pending = deferred<CanResult>();
    const can = vi.fn(() => pending.promise);
    const h = provider();
    const onError = vi.fn();
    const view = render(ScopedSurfaceHarness, { dataProvider: h.dataProvider, accessControlProvider: { can }, spec: specFor(), policy, onError });
    await waitFor(() => expect(can).toHaveBeenCalledTimes(1));
    await view.rerender({ accessControlProvider: { can: async () => ({ can: false, reason: 'Replacement denied' }) } });
    await within(view.container).findByRole('alert');
    pending.resolve({ can: true });
    await settle();
    expect(h.getList).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect((within(view.container).getByRole('alert')).textContent).toContain('Replacement denied');
  });

  test('tenant changes reauthorize using the same tenant metadata as the data provider', async () => {
    const h = provider();
    const can = vi.fn(async () => ({ can: true }));
    const view = render(ScopedSurfaceHarness, { dataProvider: h.dataProvider, accessControlProvider: { can }, spec: specFor(), policy, tenant: 'alpha' });
    await within(view.container).findByText('510');
    expect(h.getList.mock.calls[0]?.[0].meta).toEqual(resolveTenantProviderMeta({ tenantId: 'alpha' }));
    await view.rerender({ tenant: 'beta' });
    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(2));
    expect(can).toHaveBeenLastCalledWith({ resource: 'products', action: 'list', meta: resolveTenantProviderMeta({ tenantId: 'beta' }) });
    expect(h.getList.mock.calls[1]?.[0].meta).toEqual(resolveTenantProviderMeta({ tenantId: 'beta' }));
  });

  test.each([null, undefined, { can: 'true' }, { can: true, unexpected: true }])('malformed scoped decisions fail closed: %j', async (result) => {
    const h = provider();
    const view = render(ScopedSurfaceHarness, { dataProvider: h.dataProvider,
      accessControlProvider: { can: async () => result as CanResult }, spec: specFor(), policy });
    await within(view.container).findByRole('alert');
    expect(h.getList).not.toHaveBeenCalled();
    expect(h.getOne).not.toHaveBeenCalled();
  });

  test('scoped authorization failures stay sanitized and never fall back globally', async () => {
    const globalCan = vi.fn(async () => ({ can: true }));
    setAccessControlProvider({ can: globalCan });
    const h = provider();
    const view = render(ScopedSurfaceHarness, { dataProvider: h.dataProvider,
      accessControlProvider: { can: async () => { throw new Error('private-provider-diagnostic'); } }, spec: specFor(), policy });
    const alert = await within(view.container).findByRole('alert');
    expect(alert.textContent).not.toContain('private-provider-diagnostic');
    expect(h.getList).not.toHaveBeenCalled();
    expect(globalCan).not.toHaveBeenCalled();
  });
});
