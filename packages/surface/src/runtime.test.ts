import { describe, expect, test, vi } from 'vitest';
import type { BaseRecord, GetListParams, GetOneParams } from '@svadmin/core';
import type {
  ResourceListDataSource,
  ResourceOneDataSource,
  SurfaceDataProvider,
  SurfaceResourcePolicy,
} from './types.js';
import { loadSurfaceSource } from './runtime.js';
import { resolveSurfaceWidgetData } from './binding.js';

describe('loadSurfaceSource', () => {
  test('uses only the read provider contract and projects readable fields', async () => {
    const listRequests: GetListParams[] = [];
    const provider: SurfaceDataProvider = {
      getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams) => {
        listRequests.push(params);
        return {
          data: [{ id: 1, name: 'Marker', stock: 12, supplierSecret: 'hidden' }] as unknown as TData[],
          total: 1,
        };
      },
      getOne: async <TData extends BaseRecord = BaseRecord>(_params: GetOneParams) => ({
        data: { id: 1 } as unknown as TData,
      }),
    };
    const source = {
      id: 'products',
      type: 'resource-list',
      resource: 'products',
      pageSize: 10,
      sorters: [{ field: 'stock', order: 'asc' }],
    } satisfies ResourceListDataSource;
    const resourcePolicy = {
      readFields: ['id', 'name', 'stock'],
      sortFields: ['stock'],
      maxPageSize: 25,
    } satisfies SurfaceResourcePolicy;

    const sourceState = await loadSurfaceSource({
      source,
      resourcePolicy,
      provider,
      authorize: async () => ({ can: true }),
    });

    expect(listRequests).toEqual([{
      resource: 'products',
      pagination: { current: 1, pageSize: 10 },
      sorters: [{ field: 'stock', order: 'asc' }],
      filters: [],
    }]);
    expect(sourceState).toEqual({
      status: 'ready',
      sourceId: 'products',
      value: {
        items: [{ id: 1, name: 'Marker', stock: 12 }],
        total: 1,
      },
    });
  });

  test('turns an empty bound item collection into an explicit empty state', () => {
    expect(resolveSurfaceWidgetData({
      id: 'empty-table',
      type: 'resource-table',
      props: {},
      binding: { sourceId: 'products', pointer: '/items' },
    }, {
      products: {
        status: 'ready',
        sourceId: 'products',
        value: { items: [], total: 0 },
      },
    })).toEqual({ status: 'empty', sourceId: 'products' });
  });

  test('denies access before invoking the provider', async () => {
    const providerCall = vi.fn();
    const provider = {
      getList: providerCall,
      getOne: providerCall,
    } as unknown as SurfaceDataProvider;

    const state = await loadSurfaceSource({
      source: { id: 'products', type: 'resource-list', resource: 'products' },
      resourcePolicy: { readFields: ['id'] },
      provider,
      authorize: async () => ({ can: false, reason: 'Not allowed' }),
    });

    expect(providerCall).not.toHaveBeenCalled();
    expect(state).toEqual({
      status: 'error',
      sourceId: 'products',
      error: { code: 'access_denied', sourceId: 'products', message: 'Not allowed' },
    });
  });

  test('calls only getOne and projects the selected record', async () => {
    const getOneRequests: GetOneParams[] = [];
    const provider: SurfaceDataProvider = {
      getList: async () => {
        throw new Error('getList must not be called');
      },
      getOne: async <TData extends BaseRecord = BaseRecord>(params: GetOneParams) => {
        getOneRequests.push(params);
        return { data: { id: 7, name: 'Marker', secret: 'hidden' } as unknown as TData };
      },
    };
    const source = {
      id: 'product',
      type: 'resource-one',
      resource: 'products',
      recordId: 7,
    } satisfies ResourceOneDataSource;

    const state = await loadSurfaceSource({
      source,
      resourcePolicy: { readFields: ['id', 'name'], allowGetOne: true },
      provider,
      authorize: async () => ({ can: true }),
    });

    expect(getOneRequests).toEqual([{ resource: 'products', id: 7 }]);
    expect(state).toEqual({
      status: 'ready',
      sourceId: 'product',
      value: { id: 7, name: 'Marker' },
    });
  });

  test('rejects non-JSON selected values without converting them', async () => {
    const provider: SurfaceDataProvider = {
      getList: async <TData extends BaseRecord = BaseRecord>() => ({
        data: [{ id: 1, createdAt: new Date('2026-08-11T00:00:00Z') }] as unknown as TData[],
        total: 1,
      }),
      getOne: async <TData extends BaseRecord = BaseRecord>() => ({ data: { id: 1 } as unknown as TData }),
    };

    const state = await loadSurfaceSource({
      source: { id: 'products', type: 'resource-list', resource: 'products' },
      resourcePolicy: { readFields: ['id', 'createdAt'] },
      provider,
      authorize: async () => ({ can: true }),
    });

    expect(state).toEqual({
      status: 'error',
      sourceId: 'products',
      error: expect.objectContaining({ code: 'provider_result_not_json' }),
    });
  });

  test('projects only own data properties without invoking accessors', async () => {
    const inheritedField = '__surface_inherited_test__';
    const originalDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, inheritedField);
    Object.defineProperty(Object.prototype, inheritedField, {
      configurable: true,
      enumerable: true,
      value: 'inherited-secret',
      writable: true,
    });
    try {
      const inheritedState = await loadSurfaceSource({
        source: { id: 'products', type: 'resource-list', resource: 'products' },
        resourcePolicy: { readFields: ['id', inheritedField] },
        provider: {
          getList: async <TData extends BaseRecord = BaseRecord>() => ({
            data: [{ id: 1 }] as unknown as TData[],
            total: 1,
          }),
          getOne: async <TData extends BaseRecord = BaseRecord>() => ({ data: { id: 1 } as unknown as TData }),
        },
        authorize: async () => ({ can: true }),
      });
      expect(inheritedState).toEqual({
        status: 'ready',
        sourceId: 'products',
        value: { items: [{ id: 1 }], total: 1 },
      });

      let accessorInvoked = false;
      const record: BaseRecord = { id: 1 };
      Object.defineProperty(record, 'computedSecret', {
        enumerable: true,
        get() {
          accessorInvoked = true;
          return 'computed-secret';
        },
      });
      const accessorState = await loadSurfaceSource({
        source: { id: 'products', type: 'resource-list', resource: 'products' },
        resourcePolicy: { readFields: ['id', 'computedSecret'] },
        provider: {
          getList: async <TData extends BaseRecord = BaseRecord>() => ({
            data: [record] as unknown as TData[],
            total: 1,
          }),
          getOne: async <TData extends BaseRecord = BaseRecord>() => ({ data: { id: 1 } as unknown as TData }),
        },
        authorize: async () => ({ can: true }),
      });

      expect(accessorState).toEqual({
        status: 'error',
        sourceId: 'products',
        error: expect.objectContaining({ code: 'provider_result_not_json' }),
      });
      expect(accessorInvoked).toBe(false);
    } finally {
      if (originalDescriptor) Object.defineProperty(Object.prototype, inheritedField, originalDescriptor);
      else delete (Object.prototype as Record<string, unknown>)[inheritedField];
    }
  });

  test('classifies malformed provider collections as invalid results', async () => {
    const provider = {
      getList: async () => ({ data: 'not-an-array', total: 1 }),
      getOne: async () => ({ data: { id: 1 } }),
    } as unknown as SurfaceDataProvider;

    const state = await loadSurfaceSource({
      source: { id: 'products', type: 'resource-list', resource: 'products' },
      resourcePolicy: { readFields: ['id'] },
      provider,
      authorize: async () => ({ can: true }),
    });

    expect(state).toEqual({
      status: 'error',
      sourceId: 'products',
      error: expect.objectContaining({ code: 'provider_result_not_json' }),
    });
  });

  test('requires own provider response fields without invoking accessors', async () => {
    const inheritedResponse = Object.create({ data: [{ id: 7 }], total: 1 }) as unknown;
    const listState = await loadSurfaceSource({
      source: { id: 'products', type: 'resource-list', resource: 'products' },
      resourcePolicy: { readFields: ['id'] },
      provider: {
        getList: async () => inheritedResponse,
        getOne: async () => ({ data: { id: 1 } }),
      } as unknown as SurfaceDataProvider,
      authorize: async () => ({ can: true }),
    });
    expect(listState).toEqual({
      status: 'error',
      sourceId: 'products',
      error: expect.objectContaining({ code: 'provider_result_not_json' }),
    });

    let accessorInvoked = false;
    const accessorResponse = {};
    Object.defineProperty(accessorResponse, 'data', {
      enumerable: true,
      get() {
        accessorInvoked = true;
        return { id: 7 };
      },
    });
    const oneState = await loadSurfaceSource({
      source: { id: 'product', type: 'resource-one', resource: 'products', recordId: 7 },
      resourcePolicy: { readFields: ['id'], allowGetOne: true },
      provider: {
        getList: async () => ({ data: [], total: 0 }),
        getOne: async () => accessorResponse,
      } as unknown as SurfaceDataProvider,
      authorize: async () => ({ can: true }),
    });
    expect(oneState).toEqual({
      status: 'error',
      sourceId: 'product',
      error: expect.objectContaining({ code: 'provider_result_not_json' }),
    });
    expect(accessorInvoked).toBe(false);
  });

  test('reports an access-check failure without invoking the provider', async () => {
    const providerCall = vi.fn();
    const provider = { getList: providerCall, getOne: providerCall } as unknown as SurfaceDataProvider;

    const state = await loadSurfaceSource({
      source: { id: 'products', type: 'resource-list', resource: 'products' },
      resourcePolicy: { readFields: ['id'] },
      provider,
      authorize: async () => {
        throw new Error('Policy unavailable');
      },
    });

    expect(providerCall).not.toHaveBeenCalled();
    expect(state).toEqual({
      status: 'error',
      sourceId: 'products',
      error: { code: 'access_check_failed', sourceId: 'products', message: 'Policy unavailable' },
    });
  });
});
