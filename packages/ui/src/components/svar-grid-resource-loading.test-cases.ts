import { appendSvarResourcePage, loadSvarResourceChildren, loadSvarResourceWindow, type SvarResourcePageReader } from './svar-grid-resource-loading.js';

// 相同用例可由 Vitest 和无网络浏览器验证器执行；数据读取函数使用公开的注入接口。
export interface ResourceLoadingCase { name: string; run: () => Promise<void> }
const signal = () => new AbortController().signal;
const rows = (count: number, start = 0) => Array.from({ length: count }, (_, index) => ({ id: start + index, name: `Row ${start + index}` }));
const reader = (total: number, calls: number[] = []): SvarResourcePageReader => async ({ current, pageSize }) => {
  calls.push(current);
  const start = (current - 1) * pageSize;
  return { data: rows(Math.max(0, Math.min(pageSize, total - start)), start), total };
};
function same(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Mismatch: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}
async function fails(operation: () => unknown | Promise<unknown>, pattern?: RegExp): Promise<void> {
  try { await operation(); } catch (failure) {
    if (pattern && !(failure instanceof Error && pattern.test(`${failure.name}: ${failure.message}`))) throw failure;
    return;
  }
  throw new Error('Expected the operation to reject');
}

export const svarResourceLoadingCases: readonly ResourceLoadingCase[] = [
  { name: 'maps an unaligned window onto bounded one-based pages', async run() {
    const calls: number[] = [];
    const page = await loadSvarResourceWindow({ start: 23, end: 63 }, 25, reader(80, calls), signal());
    same(calls, [1, 2, 3]); same(page.data.map(row => row['id']), rows(40, 23).map(row => row.id)); same(page.total, 80);
  } },
  { name: 'supports an empty resource without inventing records', async run() {
    same(await loadSvarResourceWindow({ start: 0, end: 0 }, 25, reader(0), signal()), { data: [], total: 0 });
  } },
  { name: 'clips a final partial window to the confirmed total', async run() {
    const page = await loadSvarResourceWindow({ start: 50, end: 75 }, 25, reader(53), signal());
    same(page.data.map(row => row['id']), [50, 51, 52]); same(page.total, 53);
  } },
  { name: 'accepts a total shrinking below the old scroll position', async run() {
    same(await loadSvarResourceWindow({ start: 75, end: 100 }, 25, reader(10), signal()), { data: [], total: 10 });
  } },
  { name: 'rejects truncated Provider pages', async run() {
    await fails(() => loadSvarResourceWindow({ start: 0, end: 25 }, 25, async () => ({ data: rows(20), total: 100 }), signal()));
  } },
  { name: 'rejects changing totals within a multi-page window', async run() {
    await fails(() => loadSvarResourceWindow({ start: 23, end: 63 }, 25, async ({ current, pageSize }) => ({ data: rows(pageSize, (current - 1) * pageSize), total: current === 1 ? 80 : 90 }), signal()), /changed/);
  } },
  { name: 'does not dispatch an already aborted request', async run() {
    const controller = new AbortController(), calls: number[] = []; controller.abort();
    await fails(() => loadSvarResourceWindow({ start: 0, end: 25 }, 25, reader(100, calls), controller.signal), /SvarLoadCancelled/);
    same(calls, []);
  } },
  { name: 'drops a response and stops pagination when cancellation arrives during reading', async run() {
    const controller = new AbortController(), calls: number[] = [];
    await fails(() => loadSvarResourceWindow({ start: 0, end: 50 }, 25, async pagination => {
      const page = await reader(100, calls)(pagination); controller.abort(); return page;
    }, controller.signal), /SvarLoadCancelled/); same(calls, [1]);
  } },
  { name: 'rejects invalid ranges and page sizes before reading', async run() {
    const calls: number[] = [];
    for (const range of [{ start: -1, end: 1 }, { start: 2, end: 1 }, { start: 0, end: 2049 }]) {
      await fails(() => loadSvarResourceWindow(range, 25, reader(100, calls), signal()));
    }
    for (const size of [0, 1.5, 1001]) await fails(() => loadSvarResourceWindow({ start: 0, end: 1 }, size, reader(100, calls), signal()));
    same(calls, []);
  } },
  { name: 'loads every page of a branch instead of silently truncating it', async run() {
    const calls: number[] = [];
    const data = await loadSvarResourceChildren(25, 100, reader(53, calls), signal());
    same(calls, [1, 2, 3]); same(data.map(row => row['id']), rows(53).map(row => row.id));
  } },
  { name: 'enforces branch limits before dispatching the next page', async run() {
    const calls: number[] = [];
    await fails(() => loadSvarResourceChildren(25, 50, reader(53, calls), signal()), /child limit/); same(calls, [1]);
  } },
  { name: 'rejects duplicate IDs spanning separate child pages', async run() {
    await fails(() => loadSvarResourceChildren(25, 100, async () => ({ data: rows(25), total: 50 }), signal()));
  } },
  { name: 'rejects a changing branch total', async run() {
    await fails(() => loadSvarResourceChildren(25, 100, async ({ current }) => ({ data: rows(25, (current - 1) * 25), total: current === 1 ? 50 : 51 }), signal()), /changed/);
  } },
  { name: 'does not share mutable Provider records or nested data with the returned branch', async run() {
    const nested = { id: 2, name: 'Nested' };
    const parent = { id: 1, name: 'Original', children: [nested] };
    const data = [parent];
    const result = await loadSvarResourceChildren(25, 10, async () => ({ data, total: 1 }), signal());
    parent.name = 'Changed'; nested.name = 'Changed nested';
    same(result[0], { id: 1, name: 'Original', children: [{ id: 2, name: 'Nested' }] });
  } },
  { name: 'appends immutable pages without mutating the existing prefix', async run() {
    const before = rows(2), incoming = rows(2, 2);
    const result = appendSvarResourcePage(before, { data: incoming, total: 4 }, 4);
    const first = before[0], added = incoming[0];
    if (!first || !added) throw new Error('Missing fixture records');
    first.name = 'Changed'; added.name = 'Changed';
    same(result, rows(4)); same(before.length, 2);
  } },
  { name: 'rejects duplicate, empty-progress, overflow and changed-total appends', async run() {
    await fails(() => appendSvarResourcePage(rows(2), { data: rows(1), total: 3 }, 3));
    await fails(() => appendSvarResourcePage(rows(2), { data: [], total: 3 }, 3));
    await fails(() => appendSvarResourcePage(rows(2), { data: rows(2, 2), total: 3 }, 3));
    await fails(() => appendSvarResourcePage(rows(2), { data: rows(1, 2), total: 4 }, 3));
  } },
  { name: 'rejects non-finite and negative expected totals', async run() {
    for (const total of [NaN, Infinity, -1, 10_000_001]) await fails(() => appendSvarResourcePage([], { data: [], total }, total));
  } },
  { name: 'keeps numeric and string record IDs in distinct namespaces', async run() {
    const result = appendSvarResourcePage([{ id: 1 }], { data: [{ id: '1' }], total: 2 }, 2);
    same(result, [{ id: 1 }, { id: '1' }]);
  } },
];
