import { describe, expect, test, vi } from 'vitest';
import type { BaseRecord, GetListParams, GetListResult, GetOneResult } from '@svadmin/core';
import { createSurfaceSourceController } from './source-controller.js';
import type { SurfaceDataProvider, SurfacePolicy, SurfaceSpec } from './types.js';

const policy: SurfacePolicy = { resources: { orders: { readFields: ['id', 'name'], maxPageSize: 20 } } };
function spec(): SurfaceSpec {
  return { schemaVersion: 'surface/v1', catalogVersion: 'test/v1', surfaceId: 'orders', title: 'Orders',
    layout: { type: 'grid', columns: 12 }, widgets: [], dataSources: [
      { id: 'first', type: 'resource-list', resource: 'orders', pageSize: 10 },
      { id: 'second', type: 'resource-list', resource: 'orders', pageSize: 5 },
    ] };
}
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Not initialized'); };
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
}
function setup(response?: Promise<{ data: BaseRecord[]; total: number }>) {
  const query = vi.fn<(params: GetListParams) => void>();
  const provider: SurfaceDataProvider = {
    async getList<T extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<T>> {
      query(params);
      return (response ? await response : { data: [{ id: 1, name: 'Order' }], total: 1 }) as unknown as GetListResult<T>;
    },
    async getOne<T extends BaseRecord = BaseRecord>(): Promise<GetOneResult<T>> {
      return { data: { id: 1 } as unknown as T };
    },
  };
  const state = vi.fn();
  const error = vi.fn();
  const authorize = vi.fn(async () => ({ can: true }));
  const controller = createSurfaceSourceController({ authorize, onState: state, onError: error });
  return { provider, query, controller, state, error, authorize };
}

describe('source reconciliation', () => {
  test('title/layout edits and reordered equivalent source objects retain cached results', async () => {
    const h = setup();
    await h.controller.reconcile(spec(), policy, () => h.provider);
    await h.controller.reconcile({ ...spec(), title: 'Changed', layout: { type: 'grid', columns: 12, gap: 'lg' }, dataSources: [...spec().dataSources].reverse() }, policy, () => h.provider);
    expect(h.query).toHaveBeenCalledTimes(2);
    expect(h.authorize).toHaveBeenCalledTimes(2);
  });
  test('changing one source reloads only that source; refresh remains explicit', async () => {
    const h = setup();
    await h.controller.reconcile(spec(), policy, () => h.provider);
    await h.controller.reconcile({ ...spec(), dataSources: spec().dataSources.map((source) => source.id === 'first' ? { ...source, pageSize: 15 } : source) }, policy, () => h.provider);
    expect(h.query).toHaveBeenCalledTimes(3);
    expect(h.query.mock.lastCall?.[0].pagination?.pageSize).toBe(15);
    await h.controller.refresh('second');
    expect(h.query).toHaveBeenCalledTimes(4);
  });
  test('provider, projection policy and trusted scope changes each invalidate relevant entries', async () => {
    const h = setup();
    await h.controller.reconcile(spec(), policy, () => h.provider, 'tenant-a');
    const next = setup();
    await h.controller.reconcile(spec(), policy, () => next.provider, 'tenant-a');
    expect(next.query).toHaveBeenCalledTimes(2);
    await h.controller.reconcile(spec(), { resources: { orders: { readFields: ['id'], maxPageSize: 20 } } }, () => next.provider, 'tenant-a');
    expect(next.query).toHaveBeenCalledTimes(4);
    await h.controller.reconcile(spec(), policy, () => next.provider, 'tenant-b');
    expect(next.query).toHaveBeenCalledTimes(6);
  });
  test('does not start queries after an in-flight authorization is invalidated', async () => {
    const decision = deferred<{ can: boolean }>();
    const h = setup();
    const controller = createSurfaceSourceController({ authorize: () => decision.promise, onState: h.state });
    const request = controller.reconcile(spec(), policy, () => h.provider);
    controller.clear();
    decision.resolve({ can: true });
    await request;
    expect(h.query).not.toHaveBeenCalled();
  });
  test('removed/replaced entries and destroyed controllers ignore late data and errors', async () => {
    const response = deferred<{ data: BaseRecord[]; total: number }>();
    const h = setup(response.promise);
    const request = h.controller.reconcile(spec(), policy, () => h.provider);
    await Promise.resolve(); await Promise.resolve();
    h.controller.dispose();
    h.state.mockClear();
    response.resolve({ data: [{ id: 1 }], total: 1 });
    await request;
    expect(h.state).not.toHaveBeenCalled();
    expect(h.error).not.toHaveBeenCalled();
  });
  test('reuses an in-flight request for purely visual edits and prunes removed sources', async () => {
    const response = deferred<{ data: BaseRecord[]; total: number }>();
    const h = setup(response.promise);
    const first = h.controller.reconcile(spec(), policy, () => h.provider);
    const second = h.controller.reconcile({ ...spec(), title: 'Still loading' }, policy, () => h.provider);
    await Promise.resolve(); await Promise.resolve();
    expect(h.query).toHaveBeenCalledTimes(2);
    response.resolve({ data: [], total: 0 });
    await Promise.all([first, second]);
    await h.controller.reconcile({ ...spec(), dataSources: [] }, policy, () => h.provider);
    expect(h.state).toHaveBeenCalledWith('first', undefined);
    expect(h.state).toHaveBeenCalledWith('second', undefined);
    await h.controller.refresh();
    expect(h.query).toHaveBeenCalledTimes(2);
  });
});
