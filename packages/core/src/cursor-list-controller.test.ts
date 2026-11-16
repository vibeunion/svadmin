import { describe, expect, test } from 'bun:test';
import { createCursorListController, CursorListError, type CursorListRequestOptions } from './cursor-list-controller';
import type { CursorPage, CursorProviderInput } from './cursor-provider';

type Row = { id: string };
type Query = { status: string };
type Request = CursorProviderInput<Query, CursorListRequestOptions>;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function fixture() {
  const requests: Request[] = [];
  let failure: Error | null = null;
  let hold: ReturnType<typeof deferred<CursorPage<Row>>> | null = null;
  const controller = createCursorListController({
    query: { status: 'open' }, queryKey: 'open', scopeKey: 'tenant-a:tasks',
    provider: { async getList(input: Request) {
      requests.push(input);
      if (hold) return hold.promise;
      if (failure) throw failure;
      const offset = Number(input.cursor ?? 0);
      return { items: [{ id: `${input.query.status}-${offset}` }], nextCursor: offset < 2 ? String(offset + 1) : null };
    } },
  });
  return { controller, requests, fail: (value: Error | null) => { failure = value; }, hold: (value: typeof hold) => { hold = value; } };
}

describe('cursor list controller', () => {
  test('loads on demand, replaces pages and reuses visited pages without claiming totals', async () => {
    const { controller: c, requests } = fixture();
    expect(c.state.initialized).toBe(false);expect(c.state.hasPrevious).toBe(false);
    expect(await c.previous()).toBe(false);expect(requests).toHaveLength(0);
    expect(await c.refresh()).toBe(true);expect(c.state.items).toEqual([{ id: 'open-0' }]);
    await c.next();expect(c.state.items).toEqual([{ id: 'open-1' }]);expect(c.state.page).toBe(2);
    await c.previous();expect(c.state.items).toEqual([{ id: 'open-0' }]);await c.next();expect(requests).toHaveLength(2);
    await c.next();expect(c.state.items).toEqual([{ id: 'open-2' }]);expect(c.state.hasNext).toBe(false);expect(c.state.hasPrevious).toBe(true);
    expect(await c.next()).toBe(false);expect(c.state).not.toHaveProperty('totalPages');expect(requests).toHaveLength(3);
  });
  test('failed navigation preserves current records/page and retries the same cursor', async () => {
    const f = fixture();const c = f.controller;await c.refresh();const rows = c.state.items;
    const error = Error('read failed');f.fail(error);expect(await c.next()).toBe(false);
    expect(c.state.page).toBe(1);expect(c.state.items).toBe(rows);expect(c.state.error).toBe(error);expect(c.state.hasNext).toBe(true);
    expect(await c.retry()).toBe(false);f.fail(null);expect(await c.retry()).toBe(true);
    expect(f.requests.map(r => r.cursor)).toEqual([null, '1', '1', '1']);expect(c.state.page).toBe(2);expect(c.state.error).toBeNull();
  });
  test('navigation, refresh and retry cannot duplicate a pending request', async () => {
    const f = fixture();const c = f.controller;await c.refresh();const pending = deferred<CursorPage<Row>>();f.hold(pending);
    const read = c.next();expect(c.state.loading).toBe(true);expect(c.state.requestedPage).toBe(2);
    expect(await c.next()).toBe(false);expect(await c.previous()).toBe(false);expect(await c.refresh()).toBe(false);expect(await c.retry()).toBe(false);
    expect(f.requests).toHaveLength(2);pending.resolve({ items: [{ id: 'next' }], nextCursor: null });await read;
    expect(c.state.loading).toBe(false);expect(c.state.items).toEqual([{ id: 'next' }]);
  });
  test('query/scope changes clear old pages and abort reads even when the provider ignores cancellation', async () => {
    const f = fixture();const c = f.controller;await c.refresh();const pending = deferred<CursorPage<Row>>();f.hold(pending);
    const old = c.next();const oldSignal = f.requests.at(-1)?.options?.signal;f.hold(null);
    await c.setQuery({ status: 'closed' }, 'closed', 'tenant-b:tasks');expect(oldSignal?.aborted).toBe(true);
    expect(c.state.page).toBe(1);expect(c.state.items).toEqual([{ id: 'closed-0' }]);
    pending.resolve({ items: [{ id: 'stale' }], nextCursor: 'stale-cursor' });expect(await old).toBe(false);
    expect(c.state.queryKey).toBe('closed');expect(c.state.scopeKey).toBe('tenant-b:tasks');expect(c.state.items).toEqual([{ id: 'closed-0' }]);
    await c.next();expect(f.requests.at(-1)?.cursor).toBe('1');expect(f.requests.at(-1)?.query.status).toBe('closed');
  });
  test('new-query failure does not label old-scope rows as the new result', async () => {
    const f = fixture();const c = f.controller;await c.refresh();f.fail(Error('new scope unavailable'));
    await c.setQuery({ status: 'closed' }, 'closed', 'tenant-b:tasks');
    expect(c.state.items).toEqual([]);expect(c.state.page).toBe(1);expect(c.state.initialized).toBe(false);expect(c.state.error).toBeInstanceOf(Error);
    f.fail(null);await c.retry();expect(c.state.items).toEqual([{ id: 'closed-0' }]);expect(f.requests.at(-1)?.cursor).toBeNull();
  });
  test('equivalent query keys preserve the current page and cache', async () => {
    const f = fixture();const c = f.controller;await c.refresh();await c.next();
    expect(await c.setQuery({ status: 'open' }, 'open')).toBe(false);expect(c.state.page).toBe(2);expect(f.requests).toHaveLength(2);
  });
  test('refresh keeps the current page by default and supports explicit first-page reset', async () => {
    const f = fixture();const c = f.controller;await c.refresh();await c.next();await c.next();
    await c.refresh();expect(c.state.page).toBe(3);expect(f.requests.at(-1)?.cursor).toBe('2');expect(f.requests.at(-1)?.options?.bypassCache).toBe(true);
    await c.refresh({ resetToFirstPage: true });expect(c.state.page).toBe(1);expect(f.requests.at(-1)?.cursor).toBeNull();
    const reads = f.requests.length;await c.next();expect(f.requests).toHaveLength(reads + 1);
  });
  test('failed first-page refresh preserves the old page until a retry succeeds', async () => {
    const f = fixture();const c = f.controller;await c.refresh();await c.next();f.fail(Error('refresh failed'));
    await c.refresh({ resetToFirstPage: true });expect(c.state.page).toBe(2);expect(c.state.items).toEqual([{ id: 'open-1' }]);
    f.fail(null);await c.retry();expect(c.state.page).toBe(1);expect(f.requests.at(-1)?.options?.bypassCache).toBe(true);
  });
  test('an empty trailing page still allows returning to the previous page', async () => {
    const f = fixture();const c = f.controller;await c.refresh();const pending = deferred<CursorPage<Row>>();f.hold(pending);
    const read = c.next();pending.resolve({ items: [], nextCursor: null });await read;
    expect(c.state.page).toBe(2);expect(c.state.items).toEqual([]);expect(c.state.hasPrevious).toBe(true);expect(c.state.hasNext).toBe(false);
    await c.previous();expect(c.state.items).toEqual([{ id: 'open-0' }]);
  });
  test('a non-advancing cursor is reported without replacing the current page', async () => {
    const f = fixture();const c = f.controller;await c.refresh();const pending = deferred<CursorPage<Row>>();f.hold(pending);
    const read = c.next();pending.resolve({ items: [{ id: 'invalid' }], nextCursor: '1' });expect(await read).toBe(false);
    expect(c.state.page).toBe(1);expect(c.state.error).toBeInstanceOf(CursorListError);expect(c.state.error).toMatchObject({ code: 'CURSOR_NOT_ADVANCING' });expect(c.state.items).toEqual([{ id: 'open-0' }]);
  });
  test('cancelled reads cannot commit a late success or error', async () => {
    for (const reject of [false, true]) {
      const f = fixture();const c = f.controller;await c.refresh();const pending = deferred<CursorPage<Row>>();f.hold(pending);
      const read = c.next();c.cancel();expect(c.state.loading).toBe(false);expect(f.requests.at(-1)?.options?.signal.aborted).toBe(true);
      if (reject) pending.reject(Error('late'));else pending.resolve({ items: [{ id: 'late' }], nextCursor: null });
      expect(await read).toBe(false);expect(c.state.items).toEqual([{ id: 'open-0' }]);expect(c.state.error).toBeNull();
    }
  });
  test('subscriptions are synchronous and disposal stops notifications and further reads without DOM access', async () => {
    const f = fixture();const c = f.controller;const pages: number[] = [];const stop = c.subscribe(state => pages.push(state.page));
    expect(pages).toEqual([1]);await c.refresh();stop();const count = pages.length;await c.next();expect(pages).toHaveLength(count);
    const pending = deferred<CursorPage<Row>>();f.hold(pending);const read = c.next();c.subscribe(state => pages.push(state.page));c.dispose();const disposedCount = pages.length;
    pending.resolve({ items: [{ id: 'late' }], nextCursor: null });expect(await read).toBe(false);expect(pages).toHaveLength(disposedCount);
    expect(await c.refresh()).toBe(false);expect(await c.setQuery({ status: 'closed' }, 'other')).toBe(false);expect(c.state.loading).toBe(false);
  });
  test('new filters commit page one, query and cursor cache only after success', async () => {
    const f = fixture();const c = f.controller;await c.refresh();await c.next();
    const oldRows = c.state.items;
    const pending = deferred<CursorPage<Row>>();f.hold(pending);
    const change = c.setQuery({ status: 'closed' }, 'closed');
    expect(c.state.loading).toBe(true);expect(c.state.requestedPage).toBe(1);
    expect(c.state.page).toBe(2);expect(c.state.query).toEqual({ status: 'open' });expect(c.state.queryKey).toBe('open');
    expect(c.state.items).toBe(oldRows);expect(f.requests.at(-1)?.cursor).toBeNull();
    pending.resolve({ items: [{ id: 'closed-first' }], nextCursor: 'closed-next' });
    expect(await change).toBe(true);expect(c.state.page).toBe(1);expect(c.state.queryKey).toBe('closed');
    expect(c.state.items).toEqual([{ id: 'closed-first' }]);
    f.hold(null);await c.next();expect(f.requests.at(-1)?.cursor).toBe('closed-next');
    expect(f.requests.at(-1)?.query).toEqual({ status: 'closed' });
  });
  test('a failed filter change retains the applied page and retries its own query at page one', async () => {
    const f = fixture();const c = f.controller;await c.refresh();await c.next();
    const rows = c.state.items;f.fail(Error('query failed'));
    expect(await c.setQuery({ status: 'closed' }, 'closed')).toBe(false);
    expect(c.state.page).toBe(2);expect(c.state.items).toBe(rows);expect(c.state.queryKey).toBe('open');
    expect(c.state.query).toEqual({ status: 'open' });
    expect(await c.retry()).toBe(false);expect(c.state.items).toBe(rows);
    f.fail(null);expect(await c.retry()).toBe(true);
    expect(c.state.page).toBe(1);expect(c.state.queryKey).toBe('closed');
    expect(f.requests.slice(-3).map(request => [request.cursor, request.query.status])).toEqual([
      [null, 'closed'], [null, 'closed'], [null, 'closed'],
    ]);
  });
  test('failed query drafts cannot replace the applied query used for navigation', async () => {
    const f = fixture();const c = f.controller;await c.refresh();await c.next();
    f.fail(Error('query failed'));await c.setQuery({ status: 'closed' }, 'closed');f.fail(null);
    await c.previous();expect(c.state.queryKey).toBe('open');expect(c.state.page).toBe(1);
    expect(c.state.items).toEqual([{ id: 'open-0' }]);expect(f.requests).toHaveLength(3);
  });
  test('reverting to the applied query cancels a different pending query without losing the page', async () => {
    const f = fixture();const c = f.controller;await c.refresh();await c.next();
    const pending = deferred<CursorPage<Row>>();f.hold(pending);
    const change = c.setQuery({ status: 'closed' }, 'closed');
    await c.setQuery({ status: 'open' }, 'open');
    expect(await change).toBe(false);expect(c.state.loading).toBe(false);expect(c.state.page).toBe(2);
    pending.resolve({ items: [{ id: 'late-query' }], nextCursor: null });await Promise.resolve();
    expect(c.state.queryKey).toBe('open');expect(c.state.items).toEqual([{ id: 'open-1' }]);
  });
  test('cancel, dispose and query supersession settle even when a provider never responds', async () => {
    for (const action of ['cancel', 'dispose', 'supersede'] as const) {
      const f = fixture();const c = f.controller;await c.refresh();
      const pending = deferred<CursorPage<Row>>();f.hold(pending);
      const read = c.next();
      if (action === 'supersede') {
        f.hold(null);await c.setQuery({ status: 'closed' }, 'closed');
      } else c[action]();
      expect(await read).toBe(false);expect(c.state.loading).toBe(false);
    }
  }, 1000);
  test('late rejection after supersession cannot replace the new query error or records', async () => {
    const f = fixture();const c = f.controller;await c.refresh();
    const pending = deferred<CursorPage<Row>>();f.hold(pending);const old = c.next();f.hold(null);
    await c.setQuery({ status: 'closed' }, 'closed');expect(await old).toBe(false);
    pending.reject(Error('obsolete failure'));await new Promise(resolve => setTimeout(resolve, 0));
    expect(c.state.queryKey).toBe('closed');expect(c.state.error).toBeNull();expect(c.state.items).toEqual([{ id: 'closed-0' }]);
  });
  test('same query text in a new scope clears records immediately and never reuses old cursors', async () => {
    const f = fixture();const c = f.controller;await c.refresh();await c.next();
    const pending = deferred<CursorPage<Row>>();f.hold(pending);
    const change = c.setQuery({ status: 'open' }, 'open', 'tenant-b:tasks');
    expect(c.state.scopeKey).toBe('tenant-b:tasks');expect(c.state.items).toEqual([]);
    expect(c.state.page).toBe(1);expect(c.state.initialized).toBe(false);expect(f.requests.at(-1)?.cursor).toBeNull();
    pending.resolve({ items: [{ id: 'other-scope' }], nextCursor: null });await change;
    expect(c.state.items).toEqual([{ id: 'other-scope' }]);
  });

  test('explicit queries and clears reread page one even with the same effective conditions', async () => {
    const f = fixture();const c = f.controller;await c.refresh();await c.next();
    const before = f.requests.length;
    expect(await c.resetQuery({ status: 'open' }, 'open')).toBe(true);
    expect(c.state.page).toBe(1);expect(f.requests).toHaveLength(before + 1);
    expect(f.requests.at(-1)?.cursor).toBeNull();expect(f.requests.at(-1)?.options?.bypassCache).toBe(true);
    await c.next();expect(f.requests).toHaveLength(before + 2);
  });
  test('a failed explicit requery keeps the current page until retry success', async () => {
    const f = fixture();const c = f.controller;await c.refresh();await c.next();const rows = c.state.items;
    f.fail(Error('query failed'));expect(await c.resetQuery({ status: 'open' }, 'open')).toBe(false);
    expect(c.state.items).toBe(rows);expect(c.state.page).toBe(2);
    f.fail(null);expect(await c.retry()).toBe(true);expect(c.state.page).toBe(1);
  });
  test('an explicit requery supersedes navigation but duplicate first-page actions do not refetch', async () => {
    const f = fixture();const c = f.controller;await c.refresh();
    const pending = deferred<CursorPage<Row>>();f.hold(pending);const next = c.next();
    f.hold(null);await c.resetQuery({ status: 'open' }, 'open');expect(await next).toBe(false);expect(c.state.page).toBe(1);
    f.hold(pending);const query = c.resetQuery({ status: 'closed' }, 'closed');const count = f.requests.length;
    expect(await c.resetQuery({ status: 'closed' }, 'closed')).toBe(false);expect(f.requests).toHaveLength(count);
    c.cancel();expect(await query).toBe(false);
  });

});
