import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import {
  defaultSurfaceActionRegistry,
  defineSurfaceActionRegistry,
  executeSurfaceAction,
  type SurfaceActionContext,
} from './actions.js';
import type { SurfaceCatalog, SurfaceFilter, SurfacePolicy, SurfaceSpec } from './types.js';

const catalog = {
  version: 'tests/v1',
  widgets: [{
    type: 'metric',
    dataKind: 'scalar',
    propsSchema: z.object({ label: z.string() }).strict(),
  }],
} satisfies SurfaceCatalog;

const policy = {
  resources: {
    products: {
      readFields: ['id', 'name', 'stock'],
      filterFields: ['name', 'stock'],
      allowGetOne: true,
      maxPageSize: 20,
    },
  },
} satisfies SurfacePolicy;

const spec: SurfaceSpec = {
  schemaVersion: 'surface/v1',
  catalogVersion: catalog.version,
  surfaceId: 'inventory',
  title: 'Inventory',
  layout: { type: 'grid', columns: 12 },
  dataSources: [{ id: 'products', type: 'resource-list', resource: 'products' }],
  widgets: [{
    id: 'product-count',
    type: 'metric',
    props: { label: 'Products' },
    binding: { sourceId: 'products', pointer: '/total' },
  }],
};

function actionContext(overrides: Partial<SurfaceActionContext> = {}) {
  let transientFilters: readonly SurfaceFilter[] = [];
  const refresh = vi.fn(async () => undefined);
  const navigateResource = vi.fn(async () => undefined);
  const context: SurfaceActionContext = {
    spec,
    catalog,
    policy,
    getTransientFilters: () => transientFilters,
    applyTransientFilters: async (_sourceId, filters) => {
      transientFilters = filters;
    },
    refresh,
    navigateResource,
    ...overrides,
  };
  return { context, refresh, navigateResource, filters: () => transientFilters };
}

describe('Surface Action Registry', () => {
  test('sets a policy-allowed runtime filter and refreshes only its source', async () => {
    const runtime = actionContext();
    const result = await executeSurfaceAction({
      type: 'setFilter',
      sourceId: 'products',
      filter: { field: 'stock', operator: 'gte', value: 5 },
    }, defaultSurfaceActionRegistry, runtime.context);

    expect(result).toEqual({ ok: true, actionType: 'setFilter' });
    expect(runtime.filters()).toEqual([{ field: 'stock', operator: 'gte', value: 5 }]);
    expect(runtime.refresh).toHaveBeenCalledWith('products');
  });

  test('replaces a transient filter on the same field instead of growing without bounds', async () => {
    let transientFilters: readonly SurfaceFilter[] = [{ field: 'stock', operator: 'gte', value: 5 }];
    const runtime = actionContext({
      getTransientFilters: () => transientFilters,
      applyTransientFilters: async (_sourceId, filters) => {
        transientFilters = filters;
      },
    });
    const result = await executeSurfaceAction({
      type: 'setFilter',
      sourceId: 'products',
      filter: { field: 'stock', operator: 'lte', value: 20 },
    }, defaultSurfaceActionRegistry, runtime.context);

    expect(result.ok).toBe(true);
    expect(transientFilters).toEqual([{ field: 'stock', operator: 'lte', value: 20 }]);
  });

  test('rejects denied fields, unknown sources, and unknown actions with zero side effects', async () => {
    const runtime = actionContext();
    for (const action of [
      { type: 'setFilter', sourceId: 'products', filter: { field: 'secret', operator: 'eq', value: 'x' } },
      { type: 'refreshSource', sourceId: 'missing' },
      { type: 'deleteResource', resource: 'products' },
    ]) {
      const result = await executeSurfaceAction(action, defaultSurfaceActionRegistry, runtime.context);
      expect(result.ok).toBe(false);
    }
    expect(runtime.filters()).toEqual([]);
    expect(runtime.refresh).not.toHaveBeenCalled();
    expect(runtime.navigateResource).not.toHaveBeenCalled();
  });

  test('clears filters and delegates navigation without accepting a URL', async () => {
    let transientFilters: readonly SurfaceFilter[] = [{ field: 'name', operator: 'contains', value: 'pen' }];
    const runtime = actionContext({
      getTransientFilters: () => transientFilters,
      applyTransientFilters: async (_sourceId, filters) => {
        transientFilters = filters;
      },
    });

    expect(await executeSurfaceAction(
      { type: 'clearFilter', sourceId: 'products' },
      defaultSurfaceActionRegistry,
      runtime.context,
    )).toEqual({ ok: true, actionType: 'clearFilter' });
    expect(transientFilters).toEqual([]);

    expect(await executeSurfaceAction(
      { type: 'navigateResource', resource: 'products', recordId: 7 },
      defaultSurfaceActionRegistry,
      runtime.context,
    )).toEqual({ ok: true, actionType: 'navigateResource' });
    expect(runtime.navigateResource).toHaveBeenCalledWith({ resource: 'products', recordId: 7 });

    const urlAction = await executeSurfaceAction(
      { type: 'navigateResource', resource: 'products', url: 'https://example.invalid' },
      defaultSurfaceActionRegistry,
      runtime.context,
    );
    expect(urlAction.ok).toBe(false);
    expect(runtime.navigateResource).toHaveBeenCalledTimes(1);
  });

  test('requires strict custom schemas and unique trusted registrations', async () => {
    const handler = vi.fn(async () => undefined);
    const registry = defineSurfaceActionRegistry({
      actions: [{
        type: 'inspect',
        schema: z.object({ type: z.literal('inspect'), widgetId: z.string() }).strict(),
        handler,
      }],
    });
    const runtime = actionContext();

    expect(await executeSurfaceAction(
      { type: 'inspect', widgetId: 'product-count' },
      registry,
      runtime.context,
    )).toEqual({ ok: true, actionType: 'inspect' });
    expect(handler).toHaveBeenCalledTimes(1);

    expect((await executeSurfaceAction(
      { type: 'inspect', widgetId: 'product-count', extra: true },
      registry,
      runtime.context,
    )).ok).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);

    expect(() => defineSurfaceActionRegistry({
      actions: [
        { type: 'inspect', schema: z.object({ type: z.literal('inspect') }).strict(), handler },
        { type: 'inspect', schema: z.object({ type: z.literal('inspect') }).strict(), handler },
      ],
    })).toThrow('Duplicate surface action type');
  });

  test('rejects accessor input without executing it', async () => {
    let accessorInvoked = false;
    const action = { sourceId: 'products' };
    Object.defineProperty(action, 'type', {
      enumerable: true,
      get() {
        accessorInvoked = true;
        return 'refreshSource';
      },
    });
    const runtime = actionContext();
    const result = await executeSurfaceAction(action, defaultSurfaceActionRegistry, runtime.context);

    expect(result.ok).toBe(false);
    expect(accessorInvoked).toBe(false);
    expect(runtime.refresh).not.toHaveBeenCalled();
  });
});
