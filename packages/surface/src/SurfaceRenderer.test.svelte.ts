import { render, screen, waitFor, within } from '@testing-library/svelte';
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
import SurfaceRenderer, { type SurfaceRendererError } from './components/SurfaceRenderer.svelte';
import { DEFAULT_SURFACE_CATALOG_VERSION, defaultSurfaceCatalog } from './catalog.js';
import type { SurfaceRenderCatalog } from './catalog.js';
import type { SurfaceDataProvider, SurfacePolicy, SurfaceSpec } from './types.js';
import DiagnosticEchoWidget from '../test/fixtures/DiagnosticEchoWidget.svelte';

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

  test.each([
    { locale: 'en', messages: {}, label: 'Access denied' },
    { locale: 'zh-CN', messages: {}, label: '无权访问' },
    { locale: 'en', messages: { accessDenied: 'Contact your administrator for access' }, label: 'Contact your administrator for access' },
  ])('checks list access and keeps permission diagnostics out of widgets: $label', async ({ locale, messages, label }) => {
    const { provider, getList } = createProvider();
    const onError = vi.fn<(error: SurfaceRendererError) => void>();
    setAccessControlProvider({
      can: async () => ({ can: false, reason: 'Surface read denied' }),
    });

    render(SurfaceRenderer, { spec, policy, catalog: defaultSurfaceCatalog, dataProvider: provider, locale, messages, onError });

    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(4));
    expect(document.body.textContent).not.toContain('Surface read denied');
    for (const alert of screen.getAllByRole('alert')) expect(alert.textContent).toContain(label);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(onError).toHaveBeenCalledTimes(2);
    for (const sourceId of ['products', 'sales']) {
      expect(onError).toHaveBeenCalledWith({
        type: 'data', error: { code: 'access_denied', sourceId, message: 'Surface read denied' },
      });
    }
    expect(getList).not.toHaveBeenCalled();
  });

  test.each([
    { locale: 'en', metric: 'Data provider is unavailable', chart: 'Chart data is unavailable', table: 'Table data is unavailable' },
    { locale: 'zh-CN', metric: '数据提供器不可用', chart: '图表数据不可用', table: '表格数据不可用' },
  ])('keeps a failed permission check distinct from a denied decision in $locale', async ({ locale, metric, chart, table }) => {
    const { provider, getList } = createProvider();
    const onError = vi.fn<(error: SurfaceRendererError) => void>();
    setAccessControlProvider({
      can: async () => { throw new Error('PRIVATE access check diagnostic'); },
    });
    render(SurfaceRenderer, { spec, policy, dataProvider: provider, locale, onError });

    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(4));
    expect(screen.getByTestId('surface-widget-product-count').textContent).toContain(metric);
    for (const id of ['inventory-chart', 'sales-chart']) {
      expect(screen.getByTestId(`surface-widget-${id}`).querySelector('[role="alert"]')?.textContent).toBe(chart);
    }
    expect(screen.getByTestId('surface-widget-products-table').querySelector('[role="alert"]')?.textContent).toBe(table);
    expect(document.body.innerHTML).not.toContain('PRIVATE access check diagnostic');
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith({
      type: 'data', error: { code: 'access_check_failed', sourceId: 'products', message: 'Access control request failed' },
    });
    expect(onError).toHaveBeenCalledWith({
      type: 'data', error: { code: 'access_check_failed', sourceId: 'sales', message: 'Access control request failed' },
    });
    expect(getList).not.toHaveBeenCalled();
  });

  test.each([
    { locale: 'en', metric: 'Metric data is invalid', chart: 'Chart data is invalid', table: 'Table data is invalid' },
    { locale: 'zh-CN', metric: '指标数据无效', chart: '图表数据无效', table: '表格数据无效' },
  ])('distinguishes invalid provider results from outages in $locale', async ({ locale, metric, chart, table }) => {
    const { provider } = createProvider();
    provider.getList = async () => ({ data: [], total: -1 });
    const onError = vi.fn<(error: SurfaceRendererError) => void>();
    render(SurfaceRenderer, { spec, policy, dataProvider: provider, locale, onError });

    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(4));
    expect(screen.getByTestId('surface-widget-product-count').textContent).toContain(metric);
    for (const id of ['inventory-chart', 'sales-chart']) {
      expect(screen.getByTestId(`surface-widget-${id}`).querySelector('[role="alert"]')?.textContent).toBe(chart);
    }
    expect(screen.getByTestId('surface-widget-products-table').querySelector('[role="alert"]')?.textContent).toBe(table);
    expect(document.body.textContent).not.toContain('List total must be a non-negative finite number');
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith({
      type: 'data', error: { code: 'provider_result_not_json', sourceId: 'products', message: 'List total must be a non-negative finite number' },
    });
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  test('renders a missing validated metric binding as invalid data without exposing diagnostics', async () => {
    const { provider } = createProvider();
    const onError = vi.fn<(error: SurfaceRendererError) => void>();
    const detailSpec: SurfaceSpec = {
      ...spec,
      dataSources: [{ id: 'products', type: 'resource-one', resource: 'products', recordId: 1 }],
      widgets: [{
        id: 'product-count', type: 'metric', props: { label: 'Stock', format: 'number' },
        binding: { sourceId: 'products', pointer: '/stock' },
      }],
    };
    render(SurfaceRenderer, {
      spec: detailSpec,
      policy: { resources: { products: { ...policy.resources.products, allowGetOne: true } } },
      dataProvider: provider, onError,
    });

    expect((await screen.findByRole('alert')).textContent).toContain('Metric data is invalid');
    expect(document.body.innerHTML).not.toContain('The validated binding pointer was not found');
    // 绑定错误属于投影层，维持现有仅源加载错误触发 onError 的契约。
    expect(onError).not.toHaveBeenCalled();
  });

  test.each([
    { locale: 'en', invalidData: 'Surface data is invalid' },
    { locale: 'zh-CN', invalidData: 'Surface 数据无效' },
  ])('normalizes provider result diagnostics before custom widgets can render them in $locale', async ({ locale, invalidData }) => {
    const { provider } = createProvider();
    provider.getList = async () => ({
      data: [{ id: 1, name: 'Marker', stock: 1, PRIVATE_DIAGNOSTIC: () => 'private' }],
      total: 1,
    });
    const diagnosticCatalog = {
      ...defaultSurfaceCatalog,
      widgets: defaultSurfaceCatalog.widgets.map((widget) => widget.type === 'metric'
        ? { ...widget, component: DiagnosticEchoWidget }
        : widget),
    } satisfies SurfaceRenderCatalog;
    const diagnosticSpec = {
      ...spec,
      surfaceId: 'source-diagnostic',
      dataSources: [{ id: 'products', type: 'resource-list', resource: 'products' }],
      widgets: [{
        id: 'product-count', type: 'metric', props: { label: 'Products', format: 'number' },
        binding: { sourceId: 'products', pointer: '/total' },
      }],
    } satisfies SurfaceSpec;
    const diagnosticPolicy = {
      resources: {
        products: {
          ...policy.resources.products,
          readFields: [...policy.resources.products.readFields, 'PRIVATE_DIAGNOSTIC'],
        },
      },
    } satisfies SurfacePolicy;

    render(SurfaceRenderer, {
      spec: diagnosticSpec, policy: diagnosticPolicy,
      catalog: diagnosticCatalog, dataProvider: provider, locale,
    });

    await waitFor(() => expect(screen.getByTestId('diagnostic-message').textContent).toBe(invalidData));
    expect(document.body.innerHTML).not.toContain('PRIVATE_DIAGNOSTIC');
    expect(document.body.innerHTML).not.toContain('not JSON serializable');
  });

  test('relocalizes a cached source error without refetching or rechecking permissions', async () => {
    const { provider } = createProvider();
    provider.getList = async () => ({
      data: [{ id: 1, name: 'Marker', stock: 1, PRIVATE_DIAGNOSTIC: () => 'private' }],
      total: 1,
    });
    const getList = vi.spyOn(provider, 'getList');
    const can = vi.fn(async () => ({ can: true }));
    setAccessControlProvider({ can });
    const onError = vi.fn<(error: SurfaceRendererError) => void>();
    const diagnosticCatalog = {
      ...defaultSurfaceCatalog,
      widgets: defaultSurfaceCatalog.widgets.map((widget) => widget.type === 'metric'
        ? { ...widget, component: DiagnosticEchoWidget }
        : widget),
    } satisfies SurfaceRenderCatalog;
    const diagnosticSpec = {
      ...spec,
      surfaceId: 'source-relocalization',
      dataSources: [{ id: 'products', type: 'resource-list', resource: 'products' }],
      widgets: [{
        id: 'product-count', type: 'metric', props: { label: 'Products', format: 'number' },
        binding: { sourceId: 'products', pointer: '/total' },
      }],
    } satisfies SurfaceSpec;
    const diagnosticPolicy = {
      resources: {
        products: {
          ...policy.resources.products,
          readFields: [...policy.resources.products.readFields, 'PRIVATE_DIAGNOSTIC'],
        },
      },
    } satisfies SurfacePolicy;
    const props = {
      spec: diagnosticSpec, policy: diagnosticPolicy,
      catalog: diagnosticCatalog, dataProvider: provider, locale: 'en', onError,
    };

    const view = render(SurfaceRenderer, props);
    await waitFor(() => expect(screen.getByTestId('diagnostic-message').textContent).toBe('Surface data is invalid'));
    expect(getList).toHaveBeenCalledTimes(1);
    expect(can).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);

    await view.rerender({ ...props, locale: 'zh-CN' });
    await waitFor(() => expect(screen.getByTestId('diagnostic-message').textContent).toBe('Surface 数据无效'));
    await view.rerender({ ...props, locale: 'zh-CN', messages: { invalidData: 'Data was rejected' } });
    await waitFor(() => expect(screen.getByTestId('diagnostic-message').textContent).toBe('Data was rejected'));
    expect(getList).toHaveBeenCalledTimes(1);
    expect(can).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  test.each([
    { locale: 'en', invalidData: 'Surface data is invalid' },
    { locale: 'zh-CN', invalidData: 'Surface 数据无效' },
  ])('localizes render-time binding diagnostics before custom widgets see them in $locale', async ({ locale, invalidData }) => {
    const { provider } = createProvider();
    const onError = vi.fn<(error: SurfaceRendererError) => void>();
    const diagnosticCatalog = {
      ...defaultSurfaceCatalog,
      widgets: defaultSurfaceCatalog.widgets.map((widget) => widget.type === 'metric'
        ? { ...widget, component: DiagnosticEchoWidget }
        : widget),
    } satisfies SurfaceRenderCatalog;
    const detailSpec: SurfaceSpec = {
      ...spec,
      surfaceId: 'binding-diagnostic',
      dataSources: [{ id: 'products', type: 'resource-one', resource: 'products', recordId: 1 }],
      widgets: [{
        id: 'product-count', type: 'metric', props: { label: 'Stock', format: 'number' },
        binding: { sourceId: 'products', pointer: '/stock' },
      }],
    };

    render(SurfaceRenderer, {
      spec: detailSpec,
      policy: { resources: { products: { ...policy.resources.products, allowGetOne: true } } },
      catalog: diagnosticCatalog, dataProvider: provider, locale, onError,
    });

    await waitFor(() => expect(screen.getByTestId('diagnostic-message').textContent).toBe(invalidData));
    expect(document.body.innerHTML).not.toContain('The validated binding pointer was not found');
    // 绑定错误属于投影层，维持现有仅源加载错误触发 onError 的契约。
    expect(onError).not.toHaveBeenCalled();
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

  test.each([
    { locale: 'en', metric: 'Data provider is unavailable', chart: 'Chart data is unavailable', table: 'Table data is unavailable' },
    { locale: 'zh-CN', metric: '数据提供器不可用', chart: '图表数据不可用', table: '表格数据不可用' },
  ])('keeps provider diagnostics out of all default widgets in $locale', async ({ locale, metric, chart, table }) => {
    const onError = vi.fn<(error: SurfaceRendererError) => void>();
    const provider: SurfaceDataProvider = {
      async getList(): Promise<never> {
        throw new Error('PRIVATE provider diagnostic');
      },
      async getOne(): Promise<never> {
        throw new Error('PRIVATE provider diagnostic');
      },
    };

    render(SurfaceRenderer, { spec, policy, catalog: defaultSurfaceCatalog, dataProvider: provider, locale, onError });

    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(4));
    expect(screen.getByTestId('surface-widget-product-count').querySelector('[role="alert"]')?.textContent).toContain(metric);
    for (const id of ['inventory-chart', 'sales-chart']) {
      expect(screen.getByTestId(`surface-widget-${id}`).querySelector('[role="alert"]')?.textContent).toBe(chart);
    }
    expect(screen.getByTestId('surface-widget-products-table').querySelector('[role="alert"]')?.textContent).toBe(table);
    expect(document.body.textContent).not.toContain('PRIVATE provider diagnostic');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith({
      type: 'data', error: { code: 'provider_failed', sourceId: 'products', message: 'PRIVATE provider diagnostic' },
    });
  });

  test('uses trusted host overrides for provider failure text', async () => {
    const { provider } = createProvider();
    provider.getList = async () => { throw new Error('PRIVATE provider diagnostic'); };
    render(SurfaceRenderer, {
      spec, policy, dataProvider: provider,
      messages: { providerUnavailable: 'Metric temporarily unavailable', chartUnavailable: 'Chart temporarily unavailable', tableUnavailable: 'Table temporarily unavailable' },
    });
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(4));
    expect(screen.getByTestId('surface-widget-product-count').textContent).toContain('Metric temporarily unavailable');
    expect(screen.getByTestId('surface-widget-inventory-chart').textContent).toContain('Chart temporarily unavailable');
    expect(screen.getByTestId('surface-widget-sales-chart').textContent).toContain('Chart temporarily unavailable');
    expect(screen.getByTestId('surface-widget-products-table').textContent).toContain('Table temporarily unavailable');
    expect(document.body.textContent).not.toContain('PRIVATE provider diagnostic');
  });

  test.each([
    { source: 'products', resource: 'products', alertCount: 3 },
    { source: 'sales', resource: 'sales_orders', alertCount: 1 },
  ])('retries only failed $source and preserves other widget data through recovery', async ({ source, resource, alertCount }) => {
    const { provider } = createProvider();
    const original = provider.getList;
    let failing = true;
    const calls = vi.fn<(params: GetListParams) => void>();
    const onError = vi.fn<(error: SurfaceRendererError) => void>();
    provider.getList = async (params) => {
      calls(params);
      if (params.resource === resource && failing) throw new Error('PRIVATE provider diagnostic');
      return original(params);
    };
    const view = render(SurfaceRenderer, { spec, policy, dataProvider: provider, onError });
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(alertCount));
    const unaffectedRole = source === 'products' ? 'img' : 'table';
    const unaffectedName = source === 'products' ? 'Sales by day' : 'Products table';
    const unaffectedContent = await screen.findByRole(unaffectedRole, { name: unaffectedName });
    expect(calls).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
    await view.component['refresh'](source);
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(alertCount));
    expect(calls.mock.calls.slice(2).map(([params]) => params.resource)).toEqual([resource]);
    expect(screen.getByRole(unaffectedRole, { name: unaffectedName })).toBe(unaffectedContent);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenLastCalledWith({
      type: 'data', error: { code: 'provider_failed', sourceId: source, message: 'PRIVATE provider diagnostic' },
    });
    expect(document.body.textContent).not.toContain('PRIVATE provider diagnostic');

    failing = false;
    await view.component['refresh'](source);
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(within(screen.getByTestId('surface-widget-product-count')).getByText('2')).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Inventory by product' })).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Sales by day' })).not.toBeNull();
    expect(screen.getByRole('table', { name: 'Products table' }).textContent).toContain('Marker');
    expect(screen.getByRole(unaffectedRole, { name: unaffectedName })).toBe(unaffectedContent);
    expect(calls.mock.calls.slice(2).map(([params]) => params.resource)).toEqual([resource, resource]);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  test('refreshes data without recreating widget DOM', async () => {
    const { provider, getList } = createProvider();
    const view = render(SurfaceRenderer, { spec, policy, catalog: defaultSurfaceCatalog, dataProvider: provider });
    const widget = await screen.findByTestId('surface-widget-product-count');

    await view.component['refresh']('products');
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
    const refresh = view.component['refresh']('products');
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
