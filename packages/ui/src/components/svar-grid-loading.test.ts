import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createSvarLoadCache, SvarLoadCancelled, snapshotSvarRecords, checkedSvarRange, snapshotSvarWindow, mergeSvarBranches, projectSvarLazyRows } from './svar-grid-loading.js';

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Uninitialized deferred'); };
  let reject: (error: unknown) => void = () => { throw new Error('Uninitialized deferred'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const clone = (items: readonly Record<string, unknown>[]) => snapshotSvarRecords(items);

describe('SVAR asynchronous loading ownership', () => {
  it('deduplicates pending requests and detaches every returned copy', async () => {
    const cache = createSvarLoadCache(clone);
    const response = deferred<Record<string, unknown>[]>();
    let calls = 0;
    const load = async () => { calls++; return response.promise; };
    const first = cache.request('x', load), second = cache.request('x', load);
    response.resolve([{ id: 1, name: 'original' }]);
    const [a, b] = await Promise.all([first, second]);
    assert.equal(calls, 1); assert.notEqual(a, b); assert.notEqual(a[0], b[0]);
    const row = a[0]; assert.ok(row); row['name'] = 'mutated';
    const third = await cache.request('x', load);
    assert.equal(third[0]?.['name'], 'original'); assert.equal(calls, 1);
  });
  it('aborts retired network requests and rejects their late success', async () => {
    const cache = createSvarLoadCache(clone);
    const old = deferred<Record<string, unknown>[]>();
    let signal: AbortSignal | undefined;
    const first = cache.request('a', async next => { signal = next; return old.promise; });
    const rejected = assert.rejects(first, SvarLoadCancelled);
    await Promise.resolve(); cache.abortPendingExcept('b');
    assert.equal(signal?.aborted, true);
    const b = await cache.request('b', async () => [{ id: 2 }]);
    old.resolve([{ id: 1 }]); await rejected;
    assert.equal(b[0]?.['id'], 2);
  });
  it('retired failures cannot evict a reused request key', async () => {
    const cache = createSvarLoadCache(clone);
    const old = deferred<Record<string, unknown>[]>();
    const first = cache.request('a', async () => old.promise);
    const rejected = assert.rejects(first, SvarLoadCancelled);
    await Promise.resolve(); cache.invalidate('a');
    await cache.request('a', async () => [{ id: 2 }]);
    old.reject(new Error('late')); await rejected;
    const result = await cache.request('a', async () => { throw new Error('must be cached'); });
    assert.equal(result[0]?.['id'], 2);
  });
  it('never dispatches after disposal', async () => {
    const cache = createSvarLoadCache(clone); cache.dispose();
    await assert.rejects(cache.request('a', async () => { throw new Error('unexpected load'); }), SvarLoadCancelled);
  });
  it('retries ordinary failures and validates before caching', async () => {
    const cache = createSvarLoadCache(clone);
    await assert.rejects(cache.request('a', async () => [{ id: 1 }, { id: 1 }]));
    assert.equal((await cache.request('a', async () => [{ id: 2 }]))[0]?.['id'], 2);
  });
  it('evicts only ready entries and bounds concurrency', async () => {
    const cache = createSvarLoadCache(clone, 1, 1);
    const pending = deferred<Record<string, unknown>[]>();
    const request = cache.request('a', async () => pending.promise);
    await assert.rejects(cache.request('b', async () => []), /Too many/);
    pending.resolve([{ id: 1 }]); await request;
    await cache.request('b', async () => [{ id: 2 }]);
    let calls = 0;
    await cache.request('a', async () => { calls++; return [{ id: 3 }]; }); assert.equal(calls, 1);
  });
});

describe('SVAR remote row ranges', () => {
  it('checks and clamps ranges without accepting huge or fractional requests', () => {
    assert.deepEqual(checkedSvarRange({ row: { start: 5, end: 20 } }, 12), { start: 5, end: 12 });
    for (const row of [{ start: -1, end: 2 }, { start: 2.5, end: 3 }, { start: 0, end: 2049 }, { start: 4, end: 3 }]) assert.throws(() => checkedSvarRange({ row }, 100));
    assert.throws(() => checkedSvarRange({ row: { start: 0, end: 1 } }, Infinity));
  });
  it('accepts only the exact requested slice, including a shrinking dataset', () => {
    const range = { start: 5, end: 8 };
    assert.equal(snapshotSvarWindow({ data: [{ id: 5 }], total: 6 }, range).data.length, 1);
    assert.throws(() => snapshotSvarWindow({ data: [{ id: 5 }], total: 9 }, range));
    assert.throws(() => snapshotSvarWindow({ data: [{ id: 5 }, { id: 5 }, { id: 7 }], total: 9 }, range));
  });
});

describe('SVAR lazy tree data', () => {
  it('merges loaded children without changing source records', () => {
    const roots = [{ id: 1, name: 'Root', hasChildren: true }];
    const branches = new Map([['n:1', [{ id: 2, name: 'Child' }]]]);
    const merged = mergeSvarBranches(roots, branches, 'id', 'children');
    assert.equal(Object.hasOwn(roots[0] ?? {}, 'children'), false);
    const children = merged[0]?.['children']; assert.ok(Array.isArray(children)); assert.equal(children.length, 1);
  });
  it('rejects ancestor cycles and duplicate IDs across branches', () => {
    assert.throws(() => mergeSvarBranches([{ id: 1 }], new Map([['n:1', [{ id: 1 }]]]), 'id', 'children'));
    assert.throws(() => mergeSvarBranches([{ id: 1 }, { id: 2 }], new Map([['n:1', [{ id: 2 }]]]), 'id', 'children'));
  });
  it('uses non-business placeholder IDs and removes them after an empty branch loads', () => {
    const columns = [{ key: 'name', label: 'Name' }];
    const roots = [{ id: 1, name: 'Root', hasChildren: true }];
    const pending = projectSvarLazyRows(roots, columns, 'id', 'children', 'hasChildren', new Map(), new Set());
    assert.equal(pending[0]?.data?.[0]?.id, 'pending:n:1'); assert.equal(pending[0]?.open, false);
    const empty = projectSvarLazyRows(roots, columns, 'id', 'children', 'hasChildren', new Map([['n:1', []]]), new Set(['n:1']));
    assert.equal(empty[0]?.data, undefined);
  });
  it('preserves expansion intent when another branch finishes', () => {
    const rows = projectSvarLazyRows([{ id: 1, children: [{ id: 2 }] }], [{ key: 'id', label: 'ID' }], 'id', 'children', 'hasChildren', new Map(), new Set(['n:1']));
    assert.equal(rows[0]?.open, true);
  });
});
