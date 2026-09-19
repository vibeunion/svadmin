import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  createSurfaceSourceCache,
  sameSourceIdentity,
  snapshotSurfaceSource,
} from './source-cache.js';
import type { SurfaceSourceRequest } from './source-cache.js';
import type { SurfaceDataSource, SurfaceResourcePolicy, SurfaceSourceDataState } from './types.js';

const source: SurfaceDataSource = { id: 'products', type: 'resource-list', resource: 'products' };
const policy: SurfaceResourcePolicy = {
  readFields: ['id', 'name', 'stock'], filterFields: ['stock'], sortFields: ['name', 'stock'],
};
const ready = (id: string, total = 1): SurfaceSourceDataState => ({
  status: 'ready', sourceId: id, value: { items: [], total },
});
const failure = (id: string): SurfaceSourceDataState => ({
  status: 'error', sourceId: id,
  error: { code: 'provider_failed', sourceId: id, message: 'Offline' },
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function harness() {
  const states = new Map<string, SurfaceSourceDataState>();
  const writes: SurfaceSourceDataState[] = [];
  const errors: SurfaceSourceDataState[] = [];
  const calls: string[] = [];
  const cache = createSurfaceSourceCache({
    set(id, state) { states.set(id, state); writes.push(state); },
    remove(id) { states.delete(id); },
    onError(state) { errors.push(state); },
  });
  function request(
    id: string,
    identity: readonly unknown[] = [id],
    load: () => Promise<SurfaceSourceDataState> = async () => ready(id),
    isCurrent: () => boolean = () => true,
  ): SurfaceSourceRequest {
    return { id, identity, isCurrent, async load() { calls.push(id); return load(); } };
  }
  return { states, writes, errors, calls, cache, request };
}

describe('Surface source snapshots', () => {
  it('normalizes omitted pagination, empty arrays, and JSON property order', () => {
    const equivalent: SurfaceDataSource = {
      resource: 'products', filters: [], sorters: [], pageSize: 10,
      type: 'resource-list', id: 'products',
    };
    assert.equal(snapshotSurfaceSource(source, policy).key, snapshotSurfaceSource(equivalent, policy).key);
  });

  it('normalizes field allowlists without mutating caller arrays', () => {
    const changed = { ...policy, readFields: ['stock', 'name', 'id', 'id'], sortFields: ['stock', 'name'] };
    assert.equal(snapshotSurfaceSource(source, policy).key, snapshotSurfaceSource(source, changed).key);
    assert.deepEqual(changed.readFields, ['stock', 'name', 'id', 'id']);
  });

  it('normalizes filter object property order', () => {
    const left: SurfaceDataSource = { ...source, filters: [{ field: 'stock', operator: 'gte', value: 2 }] };
    const right: SurfaceDataSource = { ...source, filters: [{ value: 2, operator: 'gte', field: 'stock' }] };
    assert.equal(snapshotSurfaceSource(left, policy).key, snapshotSurfaceSource(right, policy).key);
  });

  it('keys every supported list query input', () => {
    const baseline = snapshotSurfaceSource(source, policy).key;
    for (const change of [
      { ...source, resource: 'orders' },
      { ...source, pageSize: 20 },
      { ...source, filters: [{ field: 'stock', operator: 'gte' as const, value: 2 }] },
      { ...source, sorters: [{ field: 'stock', order: 'asc' as const }] },
    ]) assert.notEqual(snapshotSurfaceSource(change, policy).key, baseline);
  });

  it('preserves sort priority, filter order, operators, and values', () => {
    const original: SurfaceDataSource = {
      ...source,
      sorters: [{ field: 'stock', order: 'asc' }, { field: 'name', order: 'desc' }],
      filters: [{ field: 'stock', operator: 'gte', value: 2 }, { field: 'stock', operator: 'lte', value: 9 }],
    };
    const baseline = snapshotSurfaceSource(original, policy).key;
    for (const changed of [
      { ...original, sorters: [...(original.sorters ?? [])].reverse() },
      { ...original, filters: [...(original.filters ?? [])].reverse() },
      { ...original, filters: [{ field: 'stock', operator: 'gte' as const, value: 3 }] },
      { ...original, filters: [{ field: 'stock', operator: 'gt' as const, value: 2 }] },
    ]) assert.notEqual(snapshotSurfaceSource(changed, policy).key, baseline);
  });

  it('distinguishes resource-one IDs and their primitive types', () => {
    const one: SurfaceDataSource = { id: 'one', type: 'resource-one', resource: 'products', recordId: 1 };
    const baseline = snapshotSurfaceSource(one, policy).key;
    assert.notEqual(snapshotSurfaceSource({ ...one, recordId: '1' }, policy).key, baseline);
    assert.notEqual(snapshotSurfaceSource({ ...one, recordId: 2 }, policy).key, baseline);
    assert.notEqual(snapshotSurfaceSource(source, policy).key, baseline);
  });

  it('includes every resource policy constraint in its key', () => {
    const baseline = snapshotSurfaceSource(source, policy).key;
    for (const changed of [
      { ...policy, readFields: ['id'] }, { ...policy, filterFields: [] },
      { ...policy, sortFields: [] }, { ...policy, allowGetOne: true },
      { ...policy, maxPageSize: 20 },
    ]) assert.notEqual(snapshotSurfaceSource(source, changed,).key, baseline);
  });

  it('detaches pending queries and projection policy from mutable host data', () => {
    const values = [1, 2];
    const fields = ['id', 'name'];
    const sorters: { field: string; order: 'asc' | 'desc' }[] = [{ field: 'id', order: 'asc' }];
    const input: SurfaceDataSource = { ...source, filters: [{ field: 'id', operator: 'in', value: values }], sorters };
    const snapshot = snapshotSurfaceSource(input, { readFields: fields });
    const before = JSON.stringify(snapshot);
    values.push(3);
    fields.pop();
    const firstSorter = sorters[0];
    assert.ok(firstSorter);
    firstSorter.order = 'desc';
    assert.equal(JSON.stringify(snapshot), before);
  });

  it('compares provider and scope identities without stringifying objects', () => {
    const provider = {};
    assert.equal(sameSourceIdentity(['x', provider], ['x', provider]), true);
    assert.equal(sameSourceIdentity(['x', provider], ['x', {}]), false);
    assert.equal(sameSourceIdentity(['x'], ['x', undefined]), false);
  });
});

describe('Surface source cache', () => {
  it('loads once and preserves ready-state references across equivalent plans', async () => {
    const h = harness();
    await h.cache.reconcile([h.request('a'), h.request('b')]);
    const a = h.states.get('a');
    const b = h.states.get('b');
    for (let index = 0; index < 4; index++) {
      await h.cache.reconcile([h.request('b'), h.request('a')]);
    }
    assert.deepEqual(h.calls, ['a', 'b']);
    assert.equal(h.states.get('a'), a);
    assert.equal(h.states.get('b'), b);
    assert.equal(h.writes.length, 4);
  });

  it('preserves in-flight requests through presentation edits and source reorder', async () => {
    const h = harness();
    const response = deferred<SurfaceSourceDataState>();
    const first = h.cache.reconcile([h.request('a', ['same'], () => response.promise)]);
    const second = h.cache.reconcile([h.request('a', ['same'])]);
    assert.deepEqual(h.calls, ['a']);
    const state = ready('a', 12);
    response.resolve(state);
    await Promise.all([first, second]);
    assert.equal(h.states.get('a'), state);
  });

  it('reloads only the changed query and retains the other source', async () => {
    const h = harness();
    await h.cache.reconcile([h.request('a'), h.request('b')]);
    const b = h.states.get('b');
    await h.cache.reconcile([h.request('a', ['new-filter']), h.request('b')]);
    assert.deepEqual(h.calls, ['a', 'b', 'a']);
    assert.equal(h.states.get('b'), b);
  });

  it('invalidates when provider, policy, or host scope identity changes', async () => {
    for (const changed of [['query2', null, 0], ['query', {}, 0], ['query', null, 1]]) {
      const h = harness();
      await h.cache.reconcile([h.request('a', ['query', null, 0])]);
      await h.cache.reconcile([h.request('a', changed)]);
      assert.deepEqual(h.calls, ['a', 'a']);
    }
  });

  it('forces only a named refresh, and treats an unknown ID as a no-op', async () => {
    const h = harness();
    const requests = [h.request('a'), h.request('b')];
    await h.cache.reconcile(requests);
    const b = h.states.get('b');
    await h.cache.reconcile(requests, 'missing');
    assert.deepEqual(h.calls, ['a', 'b']);
    await h.cache.reconcile(requests, 'a');
    assert.deepEqual(h.calls, ['a', 'b', 'a']);
    assert.equal(h.states.get('b'), b);
  });

  it('forces a full refresh', async () => {
    const h = harness();
    const requests = [h.request('a'), h.request('b')];
    await h.cache.reconcile(requests);
    await h.cache.reconcile(requests, true);
    assert.deepEqual(h.calls, ['a', 'b', 'a', 'b']);
  });

  it('does not make targeted refresh await an unrelated stalled request', async () => {
    const h = harness();
    const slow = deferred<SurfaceSourceDataState>();
    const requests = [h.request('a'), h.request('b', ['b'], () => slow.promise)];
    const pending = h.cache.reconcile(requests);
    await h.cache.reconcile(requests, 'a');
    assert.deepEqual(h.calls, ['a', 'b', 'a']);
    slow.resolve(ready('b'));
    await pending;
  });

  it('discards an old successful response after a newer refresh finishes', async () => {
    const h = harness();
    const old = deferred<SurfaceSourceDataState>();
    const pending = h.cache.reconcile([h.request('a', ['a'], () => old.promise)]);
    const latest = ready('a', 99);
    await h.cache.reconcile([h.request('a', ['a'], async () => latest)], 'a');
    old.resolve(ready('a', 1));
    await pending;
    assert.equal(h.states.get('a'), latest);
    assert.equal(h.writes.length, 3);
  });

  it('does not report stale errors from a superseded request', async () => {
    const h = harness();
    const old = deferred<SurfaceSourceDataState>();
    const pending = h.cache.reconcile([h.request('a', ['old'], () => old.promise)]);
    await h.cache.reconcile([h.request('a', ['new'])]);
    old.resolve(failure('a'));
    await pending;
    assert.equal(h.states.get('a')?.status, 'ready');
    assert.equal(h.errors.length, 0);
  });

  it('retires removed IDs, including when the same ID is added again', async () => {
    const h = harness();
    const old = deferred<SurfaceSourceDataState>();
    const pending = h.cache.reconcile([h.request('a', ['same'], () => old.promise)]);
    await h.cache.reconcile([]);
    assert.equal(h.states.size, 0);
    const latest = ready('a', 5);
    await h.cache.reconcile([h.request('a', ['same'], async () => latest)]);
    old.resolve(ready('a', 1));
    await pending;
    assert.equal(h.states.get('a'), latest);
  });

  it('clears invalid documents and reloads a restored valid document', async () => {
    const h = harness();
    const old = deferred<SurfaceSourceDataState>();
    const pending = h.cache.reconcile([h.request('a', ['a'], () => old.promise)]);
    h.cache.clear();
    old.resolve(failure('a'));
    await pending;
    assert.equal(h.states.size, 0);
    assert.equal(h.errors.length, 0);
    await h.cache.reconcile([h.request('a')]);
    assert.deepEqual(h.calls, ['a', 'a']);
  });

  it('blocks updates, errors, and new requests after disposal', async () => {
    const h = harness();
    const old = deferred<SurfaceSourceDataState>();
    const pending = h.cache.reconcile([h.request('a', ['a'], () => old.promise)]);
    h.cache.dispose();
    old.resolve(failure('a'));
    await pending;
    await h.cache.reconcile([h.request('a')]);
    assert.equal(h.states.size, 0);
    assert.equal(h.errors.length, 0);
    assert.equal(h.writes.length, 1);
    assert.deepEqual(h.calls, ['a']);
  });

  it('does not start a request that is already obsolete before reconciliation', async () => {
    const h = harness();
    await h.cache.reconcile([h.request('a', ['a'], async () => ready('a'), () => false)]);
    assert.deepEqual(h.calls, []);
  });

  it('checks currentness again before accepting a response, even without an effect flush', async () => {
    const h = harness();
    let current = true;
    const old = deferred<SurfaceSourceDataState>();
    const pending = h.cache.reconcile([h.request('a', ['a'], () => old.promise, () => current)]);
    current = false;
    old.resolve(failure('a'));
    await pending;
    assert.equal(h.writes.length, 1);
    assert.equal(h.errors.length, 0);
  });

  it('retries after a pre-flush invalidation instead of retaining an abandoned loading entry', async () => {
    const h = harness();
    let current = true;
    const old = deferred<SurfaceSourceDataState>();
    const pending = h.cache.reconcile([h.request('a', ['a'], () => old.promise, () => current)]);
    current = false;
    old.resolve(ready('a'));
    await pending;
    assert.equal(h.states.size, 0);
    current = true;
    await h.cache.reconcile([h.request('a')]);
    assert.deepEqual(h.calls, ['a', 'a']);
    assert.equal(h.states.get('a')?.status, 'ready');
  });

  it('retains a current error across presentation edits and retries on explicit refresh', async () => {
    const h = harness();
    await h.cache.reconcile([h.request('a', ['a'], async () => failure('a'))]);
    const error = h.states.get('a');
    await h.cache.reconcile([h.request('a')]);
    assert.equal(h.states.get('a'), error);
    assert.deepEqual(h.calls, ['a']);
    assert.equal(h.errors.length, 1);
    await h.cache.reconcile([h.request('a')], 'a');
    assert.equal(h.states.get('a')?.status, 'ready');
    assert.deepEqual(h.calls, ['a', 'a']);
  });

  it('turns loader rejections into a controlled error state', async () => {
    const h = harness();
    await h.cache.reconcile([h.request('a', ['a'], async () => { throw new Error('Network'); })]);
    const state = h.states.get('a');
    assert.equal(state?.status, 'error');
    if (state?.status === 'error') assert.equal(state.error.message, 'Network');
    assert.equal(h.errors.length, 1);
  });

  it('passes an owner-scoped guard to pending authorization across identical refreshes', async () => {
    const h = harness();
    const permission = deferred<void>();
    let obsoleteReadStarted = false;
    const pending = h.cache.reconcile([{
      id: 'a', identity: ['same'], isCurrent: () => true,
      async load(isCurrent) {
        await permission.promise;
        obsoleteReadStarted = isCurrent();
        return ready('a', 1);
      },
    }]);
    const latest = ready('a', 42);
    await h.cache.reconcile([h.request('a', ['same'], async () => latest)], 'a');
    permission.resolve();
    await pending;
    assert.equal(obsoleteReadStarted, false);
    assert.equal(h.states.get('a'), latest);
  });

  it('never shares cached data across renderer instances', async () => {
    const first = harness();
    const second = harness();
    await first.cache.reconcile([first.request('a')]);
    await second.cache.reconcile([second.request('a')]);
    assert.deepEqual(first.calls, ['a']);
    assert.deepEqual(second.calls, ['a']);
    assert.notEqual(first.states.get('a'), second.states.get('a'));
  });
});
