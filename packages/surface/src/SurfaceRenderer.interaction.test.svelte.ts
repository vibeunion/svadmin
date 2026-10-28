import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { BaseRecord, GetListParams, GetListResult, GetOneParams, GetOneResult } from '@svadmin/core';
import { resetAccessControlProvider } from '@svadmin/core/permissions';
import { resetI18n } from '@svadmin/core/i18n';
import { Type } from 'typebox';
import { DEFAULT_SURFACE_CATALOG_VERSION, defaultSurfaceCatalog, defineSurfaceCatalog } from './catalog.js';
import SubmitValuesWidget from '../test/fixtures/SubmitValuesWidget.svelte';
import SurfaceRenderer from './components/SurfaceRenderer.svelte';
import type { SurfaceDataProvider, SurfacePolicy, SurfaceSpec } from './types.js';

const policy = {
  resources: {
    products: { readFields: ['id', 'name', 'stock', 'createdAt'], maxPageSize: 25 },
  },
} satisfies SurfacePolicy;

const spec = {
  schemaVersion: 'surface/v1',
  catalogVersion: DEFAULT_SURFACE_CATALOG_VERSION,
  surfaceId: 'interaction',
  title: 'Products',
  layout: { type: 'grid', columns: 12 },
  dataSources: [{ id: 'products', type: 'resource-list', resource: 'products', pageSize: 10 }],
  widgets: [{
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
  }],
} satisfies SurfaceSpec;

function createProvider() {
  const provider: SurfaceDataProvider = {
    async getList<TData extends BaseRecord = BaseRecord>(_params: GetListParams): Promise<GetListResult<TData>> {
      const data = [
        { id: 1, name: 'Marker', stock: 12, secret: 'hidden' },
        { id: 2, name: 'Notebook', stock: 8, secret: 'hidden' },
      ];
      return { data: data as unknown as TData[], total: 2 };
    },
    async getOne<TData extends BaseRecord = BaseRecord>(_params: GetOneParams): Promise<GetOneResult<TData>> {
      return { data: { id: 1 } as unknown as TData };
    },
  };
  return provider;
}

const submitCatalog = defineSurfaceCatalog({
  version: 'submit/v1',
  widgets: [
    ...defaultSurfaceCatalog.widgets,
    {
      type: 'submit-test', dataKind: 'none', description: 'Emits submitted values',
      propsSchema: Type.Object({ title: Type.String() }, { additionalProperties: false }),
      component: SubmitValuesWidget,
    },
  ],
});

const submitSpec = {
  schemaVersion: 'surface/v1',
  catalogVersion: 'submit/v1',
  surfaceId: 'submit-interaction',
  title: 'Submit',
  layout: { type: 'grid', columns: 12 },
  dataSources: [],
  widgets: [{ id: 'submit-widget', type: 'submit-test', props: { title: '提交' } }],
} satisfies SurfaceSpec;

afterEach(() => {
  resetAccessControlProvider();
  resetI18n();
});

describe('SurfaceRenderer interactions', () => {
  test('emits a projected select-record event for the declared columns only', async () => {
    const onInteraction = vi.fn();
    render(SurfaceRenderer, { spec, policy, catalog: defaultSurfaceCatalog, dataProvider: createProvider(), onInteraction });

    const buttons = await screen.findAllByRole('button', { name: /select/i });
    expect(buttons).toHaveLength(2);
    buttons[1]?.click();

    await waitFor(() => expect(onInteraction).toHaveBeenCalledTimes(1));
    expect(onInteraction).toHaveBeenCalledWith({
      type: 'select-record',
      surfaceId: 'interaction',
      widgetId: 'products-table',
      sourceId: 'products',
      record: { name: 'Notebook', stock: 8 },
    });
  });

  test('stays read-only and renders no select affordance without a host handler', async () => {
    render(SurfaceRenderer, { spec, policy, catalog: defaultSurfaceCatalog, dataProvider: createProvider() });
    expect(await screen.findByRole('table', { name: 'Products table' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: /select/i })).toBeNull();
  });

  test('keeps the library free of side effects: no event when nothing is deliverable', async () => {
    const onInteraction = vi.fn();
    const absentSpec = {
      ...spec,
      widgets: [{
        ...spec.widgets[0],
        props: { title: 'Identifiers', columns: [{ field: 'id', label: 'ID', format: 'text' as const }] },
      }],
    } as unknown as SurfaceSpec;
    const provider = createProvider();
    provider.getList = async <TData extends BaseRecord = BaseRecord>(_params: GetListParams): Promise<GetListResult<TData>> => ({
      data: [{ name: 'Marker', stock: 12 }] as unknown as TData[], total: 1,
    });
    render(SurfaceRenderer, { spec: absentSpec, policy, catalog: defaultSurfaceCatalog, dataProvider: provider, onInteraction });

    const buttons = await screen.findAllByRole('button', { name: /select/i });
    buttons[0]?.click();
    await waitFor(() => expect(screen.queryByRole('button', { name: /select/i })).not.toBeNull());
    expect(onInteraction).not.toHaveBeenCalled();
  });
});

describe('SurfaceRenderer submit-values interactions', () => {
  test('re-emits projected component values with widget scope', async () => {
    const onInteraction = vi.fn();
    render(SurfaceRenderer, { spec: submitSpec, policy, catalog: submitCatalog, onInteraction });
    const button = await screen.findByTestId('submit-values');
    button.click();
    await waitFor(() => expect(onInteraction).toHaveBeenCalledTimes(1));
    expect(onInteraction).toHaveBeenCalledWith({
      type: 'submit-values',
      surfaceId: 'submit-interaction',
      widgetId: 'submit-widget',
      values: { name: 'Ada', days: 2, meta: { ok: true } },
    });
  });

  test('does not emit when the host has not registered interactions', async () => {
    const onInteraction = vi.fn();
    render(SurfaceRenderer, { spec: submitSpec, policy, catalog: submitCatalog });
    const button = await screen.findByTestId('submit-values');
    button.click();
    expect(onInteraction).not.toHaveBeenCalled();
  });
});
