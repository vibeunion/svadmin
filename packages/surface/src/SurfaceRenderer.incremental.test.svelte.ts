import { render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { BaseRecord, GetListParams, GetListResult, GetOneParams, GetOneResult } from '@svadmin/core';
import { setAccessControlProvider } from '@svadmin/core';
import { resetAccessControlProvider } from '@svadmin/core/permissions';
import { resetI18n } from '@svadmin/core/i18n';
import { DEFAULT_SURFACE_CATALOG_VERSION, defaultSurfaceCatalog } from './catalog.js';
import SurfaceRenderer from './components/SurfaceRenderer.svelte';
import type { SurfaceDataProvider, SurfaceDataSource, SurfacePolicy, SurfaceSpec } from './types.js';

const policy: SurfacePolicy = {
  resources: {
    products: {
      readFields: ['id', 'name', 'stock'], filterFields: ['stock'], sortFields: ['stock'],
      maxPageSize: 25, allowGetOne: true,
    },
    orders: { readFields: ['id'], maxPageSize: 25 },
  },
};
const spec: SurfaceSpec = {
  schemaVersion: 'surface/v1', catalogVersion: DEFAULT_SURFACE_CATALOG_VERSION,
  surfaceId: 'incremental', title: 'Inventory', layout: { type: 'grid', columns: 12, gap: 'md' },
  dataSources: [
    { id: 'products', type: 'resource-list', resource: 'products' },
    { id: 'orders', type: 'resource-list', resource: 'orders' },
  ],
  widgets: [
    { id: 'product-count', type: 'metric', props: { label: 'Products', format: 'number' }, binding: { sourceId: 'products', pointer: '/total' } },
    { id: 'order-count', type: 'metric', props: { label: 'Orders', format: 'number' }, binding: { sourceId: 'orders', pointer: '/total' } },
  ],
};
const singleSpec: SurfaceSpec = { ...spec, dataSources: spec.dataSources.slice(0, 1), widgets: spec.widgets.slice(0, 1) };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function createProvider(load?: (params: GetListParams) => Promise<GetListResult<BaseRecord>>) {
  const getList = vi.fn<(params: GetListParams) => void>();
  const getOne = vi.fn<(params: GetOneParams) => void>();
  const provider: SurfaceDataProvider = {
    async getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<TData>> {
      getList(params);
      if (load) return await load(params) as GetListResult<TData>;
      const total = params.resource === 'products' ? 100 + (params.pagination?.pageSize ?? 10) : 220;
      return { data: [{ id: 1, name: 'Marker', stock: 7 }] as unknown as TData[], total };
    },
    async getOne<TData extends BaseRecord = BaseRecord>(params: GetOneParams): Promise<GetOneResult<TData>> {
      getOne(params);
      return { data: { id: params.id, stock: Number(params.id) * 10 } as unknown as TData };
    },
  };
  return { provider, getList, getOne };
}
function withProductSource(source: SurfaceDataSource): SurfaceSpec {
  return { ...spec, dataSources: [source, ...spec.dataSources.slice(1)] };
}
async function settle() {
  // Drain permission, provider, and renderer microtasks without wall-clock sleeps.
  for (let index = 0; index < 4; index++) await tick();
}

afterEach(() => {
  resetAccessControlProvider();
  resetI18n();
});

describe('SurfaceRenderer incremental loading', () => {
  test('edits title, layout, widget props/order and placement without fetching or remounting', async () => {
    const h = createProvider();
    const view = render(SurfaceRenderer, { spec, policy, dataProvider: h.provider });
    expect(await screen.findByText('110')).not.toBeNull();
    const product = screen.getByTestId('surface-widget-product-count');
    const order = screen.getByTestId('surface-widget-order-count');
    const updated: SurfaceSpec = {
      ...spec, title: 'Revised inventory', layout: { type: 'grid', columns: 12, gap: 'lg' },
      widgets: [...spec.widgets].reverse().map((widget) => ({
        ...widget, props: { ...widget.props, label: `${widget.id} updated` }, placement: { columnSpan: 6 },
      })),
    };
    await view.rerender({ spec: updated });
    await settle();
    expect(screen.getByRole('heading', { name: 'Revised inventory' })).not.toBeNull();
    expect(h.getList).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('surface-widget-product-count')).toBe(product);
    expect(screen.getByTestId('surface-widget-order-count')).toBe(order);
    expect(screen.getByText('110')).not.toBeNull();
  });

  test('reuses equivalent freshly parsed JSON, default values, and reordered policy allowlists', async () => {
    const h = createProvider();
    const view = render(SurfaceRenderer, { spec, policy, dataProvider: h.provider });
    await screen.findByText('110');
    const cloned = JSON.parse(JSON.stringify(spec)) as SurfaceSpec;
    const equivalent: SurfaceSpec = {
      ...cloned,
      dataSources: [...cloned.dataSources].reverse().map((source) =>
        source.type === 'resource-list' ? { ...source, pageSize: 10, filters: [], sorters: [] } : source),
    };
    await view.rerender({
      spec: equivalent,
      policy: { ...policy, resources: { ...policy.resources, products: {
        ...policy.resources['products']!, readFields: ['stock', 'name', 'id'],
      } } },
    });
    await settle();
    expect(h.getList).toHaveBeenCalledTimes(2);
  });

  test.each<SurfaceDataSource>([
    { id: 'products', type: 'resource-list', resource: 'products', pageSize: 20 },
    { id: 'products', type: 'resource-list', resource: 'products', filters: [{ field: 'stock', operator: 'gte', value: 5 }] },
    { id: 'products', type: 'resource-list', resource: 'products', sorters: [{ field: 'stock', order: 'desc' }] },
    { id: 'products', type: 'resource-list', resource: 'orders' },
  ])('reloads only a changed source: %j', async (source) => {
    const h = createProvider();
    const view = render(SurfaceRenderer, { spec, policy, dataProvider: h.provider });
    await screen.findByText('110');
    const order = screen.getByTestId('surface-widget-order-count');
    await view.rerender({ spec: withProductSource(source) });
    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(3));
    await settle();
    expect(h.getList.mock.calls[2]?.[0].resource).toBe(source.resource);
    expect(screen.getByTestId('surface-widget-order-count')).toBe(order);
  });

  test('reprojects and reloads only the resource whose read policy changes', async () => {
    const h = createProvider();
    const view = render(SurfaceRenderer, { spec, policy, dataProvider: h.provider });
    await screen.findByText('110');
    await view.rerender({ policy: {
      resources: { ...policy.resources, products: { ...policy.resources['products']!, readFields: ['id'] } },
    } });
    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(3));
    expect(h.getList.mock.calls[2]?.[0].resource).toBe('products');
  });

  test('does not reload for changes to an unused resource policy', async () => {
    const h = createProvider();
    const view = render(SurfaceRenderer, { spec, policy, dataProvider: h.provider });
    await screen.findByText('110');
    await view.rerender({ policy: { resources: { ...policy.resources, users: { readFields: ['id'] } } } });
    await settle();
    expect(h.getList).toHaveBeenCalledTimes(2);
  });

  test('invalidates on provider replacement and explicit host data-scope changes', async () => {
    const first = createProvider();
    const next = createProvider();
    const view = render(SurfaceRenderer, { spec, policy, dataProvider: first.provider, dataScopeKey: 'session-1' });
    await screen.findByText('110');
    await view.rerender({ dataProvider: next.provider });
    await waitFor(() => expect(next.getList).toHaveBeenCalledTimes(2));
    await view.rerender({ dataScopeKey: 'session-2' });
    await waitFor(() => expect(next.getList).toHaveBeenCalledTimes(4));
    expect(first.getList).toHaveBeenCalledTimes(2);
  });

  test('rechecks changed access control and removes previously ready data on denial', async () => {
    const h = createProvider();
    render(SurfaceRenderer, { spec: singleSpec, policy, dataProvider: h.provider });
    await screen.findByText('110');
    const can = vi.fn(async () => ({ can: false, reason: 'Read permission revoked' }));
    setAccessControlProvider({ can });
    expect((await screen.findByRole('alert')).textContent).toContain('Read permission revoked');
    expect(screen.queryByText('110')).toBeNull();
    expect(can).toHaveBeenCalledTimes(1);
    expect(h.getList).toHaveBeenCalledTimes(1);
  });

  test('retains the same in-flight request through a title change', async () => {
    const response = deferred<GetListResult<BaseRecord>>();
    const h = createProvider(() => response.promise);
    const view = render(SurfaceRenderer, { spec: singleSpec, policy, dataProvider: h.provider });
    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(1));
    await view.rerender({ spec: { ...singleSpec, title: 'Edited while loading' } });
    await settle();
    expect(h.getList).toHaveBeenCalledTimes(1);
    response.resolve({ data: [], total: 310 });
    expect(await screen.findByText('310')).not.toBeNull();
  });

  test('drops an old response after a newer query finishes', async () => {
    const old = deferred<GetListResult<BaseRecord>>();
    let count = 0;
    const h = createProvider(async () => ++count === 1 ? old.promise : { data: [], total: 310 });
    const view = render(SurfaceRenderer, { spec: singleSpec, policy, dataProvider: h.provider });
    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(1));
    await view.rerender({ spec: { ...singleSpec, dataSources: [
      { id: 'products', type: 'resource-list', resource: 'products', pageSize: 20 },
    ] } });
    await screen.findByText('310');
    old.resolve({ data: [], total: 999 });
    await settle();
    expect(screen.queryByText('999')).toBeNull();
    expect(screen.getByText('310')).not.toBeNull();
  });

  test('rejects an invalid edit without a query, then reloads after recovery', async () => {
    const old = deferred<GetListResult<BaseRecord>>();
    let count = 0;
    const h = createProvider(async () => ++count === 1 ? old.promise : { data: [], total: 310 });
    const onError = vi.fn();
    const view = render(SurfaceRenderer, { spec: singleSpec, policy, dataProvider: h.provider, onError });
    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(1));
    await view.rerender({ spec: { ...singleSpec, widgets: [{ ...singleSpec.widgets[0], type: 'unknown' }] } });
    await screen.findByRole('alert');
    old.reject(new Error('Obsolete request failure'));
    await settle();
    expect(h.getList).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls.every(([error]) => error.type === 'validation')).toBe(true);
    await view.rerender({ spec: singleSpec });
    await screen.findByText('310');
    expect(h.getList).toHaveBeenCalledTimes(2);
  });

  test('deleting then re-adding the same source ID cannot revive its old request', async () => {
    const old = deferred<GetListResult<BaseRecord>>();
    let productCalls = 0;
    const h = createProvider(async (params) => {
      if (params.resource === 'orders') return { data: [], total: 220 };
      return ++productCalls === 1 ? old.promise : { data: [], total: 310 };
    });
    const view = render(SurfaceRenderer, { spec, policy, dataProvider: h.provider });
    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(2));
    await view.rerender({ spec: { ...spec, dataSources: spec.dataSources.slice(1), widgets: spec.widgets.slice(1) } });
    await view.rerender({ spec });
    await screen.findByText('310');
    old.resolve({ data: [], total: 999 });
    await settle();
    expect(h.getList).toHaveBeenCalledTimes(3);
    expect(screen.queryByText('999')).toBeNull();
  });

  test('stops pending authorization from starting a query after invalidation', async () => {
    const permission = deferred<{ can: boolean }>();
    const can = vi.fn(() => permission.promise);
    setAccessControlProvider({ can });
    const h = createProvider();
    const view = render(SurfaceRenderer, { spec: singleSpec, policy, dataProvider: h.provider });
    await waitFor(() => expect(can).toHaveBeenCalledTimes(1));
    await view.rerender({ spec: { ...singleSpec, catalogVersion: 'invalid' } });
    permission.resolve({ can: true });
    await settle();
    expect(h.getList).not.toHaveBeenCalled();
  });

  test('ignores a rejected provider request after unmount', async () => {
    const response = deferred<GetListResult<BaseRecord>>();
    const h = createProvider(() => response.promise);
    const onError = vi.fn();
    const view = render(SurfaceRenderer, { spec: singleSpec, policy, dataProvider: h.provider, onError });
    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(1));
    await view.unmount();
    response.reject(new Error('Late failure'));
    await settle();
    expect(onError).not.toHaveBeenCalled();
  });

  test('keeps refresh(sourceId), refresh(), and unknown-source behavior', async () => {
    const h = createProvider();
    const view = render(SurfaceRenderer, { spec, policy, dataProvider: h.provider });
    await screen.findByText('110');
    await view.component['refresh']('missing');
    expect(h.getList).toHaveBeenCalledTimes(2);
    await view.component['refresh']('products');
    expect(h.getList).toHaveBeenCalledTimes(3);
    await view.component['refresh']();
    expect(h.getList).toHaveBeenCalledTimes(5);
  });

  test('does not fetch for locale, message, or equivalent catalog changes', async () => {
    const h = createProvider();
    const view = render(SurfaceRenderer, { spec, policy, dataProvider: h.provider });
    await screen.findByText('110');
    await view.rerender({ locale: 'zh-CN', messages: { providerUnavailable: '不可用' }, catalog: {
      ...defaultSurfaceCatalog, widgets: [...defaultSurfaceCatalog.widgets],
    } });
    await settle();
    expect(h.getList).toHaveBeenCalledTimes(2);
  });

  test('reloads a resource-one source when recordId changes', async () => {
    const h = createProvider();
    const one: SurfaceSpec = {
      ...singleSpec,
      dataSources: [{ id: 'products', type: 'resource-one', resource: 'products', recordId: 1 }],
      widgets: [{ ...singleSpec.widgets[0]!, binding: { sourceId: 'products', pointer: '/stock' } }],
    };
    const view = render(SurfaceRenderer, { spec: one, policy, dataProvider: h.provider });
    await screen.findByText('10');
    await view.rerender({ spec: { ...one, dataSources: [
      { id: 'products', type: 'resource-one', resource: 'products', recordId: 2 },
    ] } });
    await screen.findByText('20');
    expect(h.getOne).toHaveBeenCalledTimes(2);
    expect(h.getList).not.toHaveBeenCalled();
  });
});
