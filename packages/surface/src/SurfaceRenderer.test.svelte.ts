import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type {
  BaseRecord,
  GetListParams,
  GetListResult,
  GetOneParams,
  GetOneResult,
} from '@svadmin/core';
import { setAccessControlProvider } from '@svadmin/core';
import { resetI18n, setLocale } from '@svadmin/core/i18n';
import { resetAccessControlProvider } from '@svadmin/core/permissions';
import SurfaceRenderer from './components/SurfaceRenderer.svelte';
import { DEFAULT_SURFACE_CATALOG_VERSION, defaultSurfaceCatalog } from './catalog.js';
import type { SurfaceDataProvider, SurfacePolicy, SurfaceSpec } from './types.js';

const policy = {
  resources: {
    products: {
      readFields: ['id', 'name', 'stock'],
      sortFields: ['stock'],
      maxPageSize: 25,
    },
    sales_orders: {
      readFields: ['id', 'orderedAt', 'amount'],
      sortFields: ['orderedAt'],
      maxPageSize: 25,
    },
  },
} satisfies SurfacePolicy;

const spec = {
  schemaVersion: 'surface/v1',
  catalogVersion: DEFAULT_SURFACE_CATALOG_VERSION,
  surfaceId: 'operations-overview',
  title: 'Operations overview',
  layout: { type: 'grid', columns: 12, gap: 'md' },
  dataSources: [
    { id: 'products', type: 'resource-list', resource: 'products', pageSize: 10 },
    {
      id: 'sales',
      type: 'resource-list',
      resource: 'sales_orders',
      pageSize: 10,
      sorters: [{ field: 'orderedAt', order: 'asc' }],
    },
  ],
  widgets: [
    {
      id: 'product-count',
      type: 'metric',
      props: { label: 'Products', format: 'number' },
      binding: { sourceId: 'products', pointer: '/total' },
      placement: { columnSpan: 3 },
    },
    {
      id: 'inventory-chart',
      type: 'bar-chart',
      props: { title: 'Inventory by product', labelField: 'name', valueField: 'stock' },
      binding: { sourceId: 'products', pointer: '/items' },
      placement: { columnSpan: 9 },
    },
    {
      id: 'sales-chart',
      type: 'line-chart',
      props: { title: 'Sales by day', labelField: 'orderedAt', valueField: 'amount' },
      binding: { sourceId: 'sales', pointer: '/items' },
      placement: { columnSpan: 6 },
    },
    {
      id: 'products-table',
      type: 'resource-table',
      props: {
        title: 'Products table',
        columns: [
          { field: 'name', label: 'Product' },
          { field: 'stock', label: 'Stock', format: 'number' },
        ],
      },
      binding: { sourceId: 'products', pointer: '/items' },
      placement: { columnSpan: 6 },
    },
  ],
} satisfies SurfaceSpec;

const tableSpec = {
  schemaVersion: 'surface/v1',
  catalogVersion: DEFAULT_SURFACE_CATALOG_VERSION,
  surfaceId: 'table-states',
  title: 'Table states',
  layout: { type: 'grid', columns: 12 },
  dataSources: [{ id: 'products', type: 'resource-list', resource: 'products' }],
  widgets: [{
    id: 'products-table',
    type: 'resource-table',
    props: { title: 'Products table', columns: [{ field: 'name', label: 'Product' }] },
    binding: { sourceId: 'products', pointer: '/items' },
  }],
} satisfies SurfaceSpec;

afterEach(() => {
  resetAccessControlProvider();
  resetI18n();
});

function createProvider() {
  const getListCalls = vi.fn<(params: GetListParams) => void>();
  const provider: SurfaceDataProvider = {
    async getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<TData>> {
      getListCalls(params);
      const data = params.resource === 'products'
        ? [
            { id: 1, name: 'Marker', stock: 12 },
            { id: 2, name: 'Notebook', stock: 8 },
          ]
        : [
            { id: 10, orderedAt: '2026-08-10', amount: 120 },
            { id: 11, orderedAt: '2026-08-11', amount: 180 },
          ];
      return { data: data as unknown as TData[], total: 2 };
    },
    async getOne<TData extends BaseRecord = BaseRecord>(_params: GetOneParams): Promise<GetOneResult<TData>> {
      return { data: { id: 1 } as unknown as TData };
    },
  };
  return { provider, getList: getListCalls };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

describe('SurfaceRenderer', () => {
  test('validates once, shares each source, and renders the default catalog', async () => {
    const { provider, getList } = createProvider();

    render(SurfaceRenderer, { spec, policy, catalog: defaultSurfaceCatalog, dataProvider: provider });

    expect(await screen.findByRole('heading', { name: 'Operations overview' })).not.toBeNull();
    expect((await screen.findAllByText('Marker')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('table', { name: 'Products table' })).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Inventory by product' })).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Sales by day' })).not.toBeNull();
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(2));
  });

  test('rejects the entire surface before sending a query', async () => {
    const { provider, getList } = createProvider();
    const invalidSpec = {
      ...spec,
      widgets: [{ ...spec.widgets[0], props: { label: 'Products', format: 'number', class: 'hidden' } }],
    };

    render(SurfaceRenderer, {
      spec: invalidSpec,
      policy,
      catalog: defaultSurfaceCatalog,
      dataProvider: provider,
    });

    expect((await screen.findByRole('alert')).textContent).toContain('Surface could not be rendered');
    expect(getList).not.toHaveBeenCalled();
  });

  test('checks list access before querying each resource', async () => {
    const { provider, getList } = createProvider();
    setAccessControlProvider({
      can: async () => ({ can: false, reason: 'Surface read denied' }),
    });

    render(SurfaceRenderer, { spec, policy, catalog: defaultSurfaceCatalog, dataProvider: provider });

    expect((await screen.findAllByRole('alert'))[0]?.textContent).toContain('Surface read denied');
    expect(getList).not.toHaveBeenCalled();
  });

  test('renders explicit loading and empty states', async () => {
    const response = deferred<{ data: BaseRecord[]; total: number }>();
    const provider: SurfaceDataProvider = {
      async getList<TData extends BaseRecord = BaseRecord>(): Promise<GetListResult<TData>> {
        return response.promise as Promise<GetListResult<TData>>;
      },
      async getOne<TData extends BaseRecord = BaseRecord>(): Promise<GetOneResult<TData>> {
        return { data: { id: 1 } as unknown as TData };
      },
    };

    render(SurfaceRenderer, { spec: tableSpec, policy, catalog: defaultSurfaceCatalog, dataProvider: provider });
    expect(await screen.findByText('Loading table')).not.toBeNull();

    response.resolve({ data: [], total: 0 });
    expect(await screen.findByText('No records')).not.toBeNull();
  });

  test('follows the active i18n locale for built-in widget states', async () => {
    const response = deferred<{ data: BaseRecord[]; total: number }>();
    const provider: SurfaceDataProvider = {
      async getList<TData extends BaseRecord = BaseRecord>(): Promise<GetListResult<TData>> {
        return response.promise as Promise<GetListResult<TData>>;
      },
      async getOne<TData extends BaseRecord = BaseRecord>(): Promise<GetOneResult<TData>> {
        return { data: { id: 1 } as unknown as TData };
      },
    };

    setLocale('en');
    render(SurfaceRenderer, { spec: tableSpec, policy, catalog: defaultSurfaceCatalog, dataProvider: provider });
    expect(await screen.findByText('Loading table')).not.toBeNull();

    setLocale('zh-CN');
    expect(await screen.findByText('正在加载表格')).not.toBeNull();

    response.resolve({ data: [], total: 0 });
    expect(await screen.findByText('暂无记录')).not.toBeNull();
  });

  test('renders a provider failure as a widget error state', async () => {
    const provider: SurfaceDataProvider = {
      async getList(): Promise<never> {
        throw new Error('Network offline');
      },
      async getOne(): Promise<never> {
        throw new Error('Network offline');
      },
    };

    render(SurfaceRenderer, { spec: tableSpec, policy, catalog: defaultSurfaceCatalog, dataProvider: provider });

    expect((await screen.findByRole('alert')).textContent).toContain('Network offline');
  });

  test('refreshes data without recreating widget DOM', async () => {
    const { provider, getList } = createProvider();
    const view = render(SurfaceRenderer, { spec, policy, catalog: defaultSurfaceCatalog, dataProvider: provider });
    const widget = await screen.findByTestId('surface-widget-product-count');

    await view.component.refresh('products');
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(3));
    expect(screen.getByTestId('surface-widget-product-count')).toBe(widget);
  });

  test('discards a stale response after a newer refresh completes', async () => {
    const first = deferred<{ data: BaseRecord[]; total: number }>();
    const second = deferred<{ data: BaseRecord[]; total: number }>();
    let requestCount = 0;
    const provider: SurfaceDataProvider = {
      async getList<TData extends BaseRecord = BaseRecord>(): Promise<GetListResult<TData>> {
        requestCount += 1;
        return (requestCount === 1 ? first.promise : second.promise) as Promise<GetListResult<TData>>;
      },
      async getOne<TData extends BaseRecord = BaseRecord>(): Promise<GetOneResult<TData>> {
        return { data: { id: 1 } as unknown as TData };
      },
    };
    const metricSpec = {
      schemaVersion: 'surface/v1',
      catalogVersion: DEFAULT_SURFACE_CATALOG_VERSION,
      surfaceId: 'stale-response',
      title: 'Stale response',
      layout: { type: 'grid', columns: 12 },
      dataSources: [{ id: 'products', type: 'resource-list', resource: 'products' }],
      widgets: [{
        id: 'product-count',
        type: 'metric',
        props: { label: 'Products', format: 'number' },
        binding: { sourceId: 'products', pointer: '/total' },
      }],
    } satisfies SurfaceSpec;
    const view = render(SurfaceRenderer, {
      spec: metricSpec,
      policy,
      catalog: defaultSurfaceCatalog,
      dataProvider: provider,
    });

    await waitFor(() => expect(requestCount).toBe(1));
    const refresh = view.component.refresh('products');
    await waitFor(() => expect(requestCount).toBe(2));
    second.resolve({ data: [{ id: 2, name: 'New', stock: 1 }], total: 2 });
    await refresh;
    expect(await screen.findByText('2')).not.toBeNull();

    first.resolve({ data: [{ id: 1, name: 'Old', stock: 1 }], total: 1 });
    await first.promise;
    await waitFor(() => expect(screen.queryByText('1')).toBeNull());
    expect(screen.getByText('2')).not.toBeNull();
  });
});
