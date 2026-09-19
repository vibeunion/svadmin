import { snapshotSvarRecords, snapshotSvarWindow, SvarLoadCancelled, type SvarRange, type SvarWindowPage } from './svar-grid-loading.js';

export interface SvarLazyTree {
  /** Resource field containing the parent record ID. */
  readonly parentField: string;
  readonly rootValue?: string | number | null;
  readonly hasChildrenKey?: string;
  /** A branch is rejected rather than silently truncated above this bound. Default: 10,000. */
  readonly maxChildren?: number;
}
export type SvarResourcePageReader = (pagination: { current: number; pageSize: number }) => Promise<SvarWindowPage>;

function checkSignal(signal: AbortSignal): void {
  if (signal.aborted) throw new SvarLoadCancelled();
}
function checkPageSize(pageSize: number): void {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error('Invalid resource page size');
}
function checkPage(page: SvarWindowPage, start: number, size: number, primaryKey: string): SvarWindowPage {
  return snapshotSvarWindow(page, { start, end: start + size }, primaryKey);
}

/** Translate a zero-based exclusive grid window to the existing one-based Provider pagination. */
export async function loadSvarResourceWindow(
  range: SvarRange, pageSize: number, read: SvarResourcePageReader, signal: AbortSignal, primaryKey = 'id',
): Promise<SvarWindowPage> {
  checkPageSize(pageSize); checkSignal(signal);
  if (!Number.isSafeInteger(range.start) || !Number.isSafeInteger(range.end) || range.start < 0
    || range.end < range.start || range.end > 10_000_000 || range.end - range.start > 2048) throw new Error('Invalid resource window');
  const first = Math.floor(range.start / pageSize);
  const last = Math.max(first, Math.ceil(range.end / pageSize) - 1);
  let total: number | undefined;
  const rows: Record<string, unknown>[] = [];
  for (let pageIndex = first; pageIndex <= last; pageIndex++) {
    checkSignal(signal);
    const page = checkPage(await read({ current: pageIndex + 1, pageSize }), pageIndex * pageSize, pageSize, primaryKey);
    checkSignal(signal);
    if (total !== undefined && total !== page.total) throw new Error('Resource changed during window loading; refresh');
    total = page.total; rows.push(...page.data);
    if ((pageIndex + 1) * pageSize >= total) break;
  }
  const data = rows.slice(range.start - first * pageSize, range.end - first * pageSize);
  return snapshotSvarWindow({ data, total: total ?? 0 }, range, primaryKey);
}

/** Load all children in bounded pages. Partial branches must never masquerade as complete trees. */
export async function loadSvarResourceChildren(
  pageSize: number, maxChildren: number, read: SvarResourcePageReader, signal: AbortSignal, primaryKey = 'id', childrenKey = 'children',
): Promise<readonly Record<string, unknown>[]> {
  checkPageSize(pageSize); checkSignal(signal);
  if (!Number.isSafeInteger(maxChildren) || maxChildren < 1 || maxChildren > 100_000) throw new Error('Invalid child limit');
  let total: number | undefined;
  const rows: Record<string, unknown>[] = [];
  for (let pageIndex = 0; ; pageIndex++) {
    checkSignal(signal);
    const page = checkPage(await read({ current: pageIndex + 1, pageSize }), pageIndex * pageSize, pageSize, primaryKey);
    checkSignal(signal);
    if (page.total > maxChildren) throw new Error('Branch exceeds the configured child limit');
    if (total !== undefined && total !== page.total) throw new Error('Branch changed during loading; retry');
    total = page.total; rows.push(...page.data);
    if (rows.length >= total) return snapshotSvarRecords(rows, primaryKey, childrenKey);
  }
}

export function appendSvarResourcePage(
  rows: readonly Record<string, unknown>[], page: SvarWindowPage, expectedTotal: number, primaryKey = 'id',
): readonly Record<string, unknown>[] {
  if (!Number.isSafeInteger(expectedTotal) || expectedTotal < 0 || expectedTotal > 10_000_000) throw new Error('Invalid expected total');
  if (page.total !== expectedTotal) throw new Error('Resource changed during infinite loading; refresh');
  if (rows.length + page.data.length > expectedTotal || (!page.data.length && rows.length < expectedTotal)) throw new Error('Invalid next resource page');
  return snapshotSvarRecords([...rows, ...page.data], primaryKey);
}
