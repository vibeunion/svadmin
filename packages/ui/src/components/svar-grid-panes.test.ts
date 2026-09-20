import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createSvarPanePair, type SvarManagedApi } from './svar-grid-panes.js';

function engine() {
  const handlers = new Map<string, ((event: unknown) => void)[]>();
  const calls: { action: string; params: Record<string, unknown> | undefined }[] = [];
  let scrollTop = 0;
  const api: SvarManagedApi = {
    intercept() {},
    on(action, callback) { handlers.set(action, [...(handlers.get(action) ?? []), callback]); },
    getState() { return { scrollTop, selectedRows: [] }; },
    async exec(action, params) {
      calls.push({ action, params });
      if (action === 'scroll-to' && typeof params?.['top'] === 'number') scrollTop = params['top'];
      for (const callback of handlers.get(action) ?? []) callback(params);
    },
  };
  return { api, calls };
}

describe('SVAR independent right pane', () => {
  it('synchronizes vertical scrolling without copying horizontal position or looping', async () => {
    const pair = createSvarPanePair(() => true), left = engine(), right = engine();
    pair.attach(0, left.api); pair.attach(1, right.api);
    await left.api.exec('scroll-to', { top: 440, left: 250 });
    assert.deepEqual(right.calls, [{ action: 'scroll-to', params: { top: 440 } }]);
    assert.equal(left.calls.length, 1);
  });
  it('mirrors sorting, filtering and expansion through public actions', async () => {
    for (const [action, params] of [
      ['sort-rows', { key: 'column:name', order: 'desc', add: false }],
      ['filter-rows', { key: 'column:name', value: 'a' }],
      ['open-row', { id: 'n:1', nested: false }], ['close-row', { id: 'n:1', nested: false }],
    ] as const) {
      const pair = createSvarPanePair(() => true), left = engine(), right = engine();
      pair.attach(0, left.api); pair.attach(1, right.api);
      await right.api.exec(action, params);
      assert.deepEqual(left.calls, [{ action, params }]); assert.equal(right.calls.length, 1);
    }
  });
  it('blocks stale, disposed and superseded pane events', async () => {
    let current = true;
    const pair = createSvarPanePair(() => current), left = engine(), right = engine(), next = engine();
    pair.attach(0, left.api); pair.attach(1, right.api); pair.attach(0, next.api);
    await left.api.exec('scroll-to', { top: 40 }); assert.equal(right.calls.length, 0);
    current = false; await next.api.exec('scroll-to', { top: 40 }); assert.equal(right.calls.length, 0);
    current = true; pair.dispose(); await next.api.exec('scroll-to', { top: 80 }); assert.equal(right.calls.length, 0);
  });
  it('never forwards templates, callbacks or invalid scroll values', async () => {
    const pair = createSvarPanePair(() => true), left = engine(), right = engine();
    pair.attach(0, left.api); pair.attach(1, right.api);
    await left.api.exec('scroll-to', { top: Infinity });
    await left.api.exec('filter-rows', { key: 'column:name', value: () => true });
    assert.equal(right.calls.length, 0);
  });
});
