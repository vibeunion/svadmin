import { snapshotPlainData, decodeBaseRecord } from '@svadmin/core/schema';
import { projectSvarRows, type SvarColumn, type SvarRow } from './svar-grid-contract.js';
import { svarRecordIndex, svarRecordKey, type SvarRecordId } from './svar-grid-operations.js';

export interface SvarRange { readonly start: number; readonly end: number }
export interface SvarWindowPage { readonly data: readonly Record<string, unknown>[]; readonly total: number }
export interface SvarWindowSource {
  readonly total: number;
  /** 可信宿主负责数据契约和后端授权，范围使用从零开始、右端不含的索引。 */
  readonly load: (request: SvarRange & { readonly signal: AbortSignal }) => Promise<SvarWindowPage>;
}
export type SvarChildrenLoader = (request: {
  readonly id: SvarRecordId;
  readonly signal: AbortSignal;
}) => Promise<readonly Record<string, unknown>[]>;

export class SvarLoadCancelled extends Error {
  constructor() { super('Grid request was superseded'); this.name = 'SvarLoadCancelled'; }
}

type CacheEntry<T> =
  | { kind: 'pending'; owner: object; controller: AbortController; promise: Promise<T> }
  | { kind: 'ready'; owner: object; value: T };

/** 单个网格的有界缓存：同键请求去重，AbortSignal 加请求所有者双重隔离。 */
export function createSvarLoadCache<T>(copy: (value: T) => T, maxReady = 32, maxPending = 8) {
  const entries = new Map<string, CacheEntry<T>>();
  let disposed = false;
  function clear(): void {
    const pending = [...entries.values()];
    entries.clear();
    for (const entry of pending) if (entry.kind === 'pending') entry.controller.abort();
  }
  function trim(): void {
    let count = [...entries.values()].filter(entry => entry.kind === 'ready').length;
    for (const [key, entry] of entries) {
      if (count <= maxReady) break;
      if (entry.kind === 'ready') { entries.delete(key); count--; }
    }
  }
  function request(key: string, load: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (disposed) return Promise.reject(new SvarLoadCancelled());
    const existing = entries.get(key);
    if (existing?.kind === 'pending') return existing.promise.then(copy);
    if (existing?.kind === 'ready') {
      entries.delete(key); entries.set(key, existing);
      return Promise.resolve(copy(existing.value));
    }
    if ([...entries.values()].filter(entry => entry.kind === 'pending').length >= maxPending) {
      return Promise.reject(new Error('Too many simultaneous grid requests'));
    }
    const owner = {};
    const controller = new AbortController();
    const current = () => !disposed && !controller.signal.aborted && entries.get(key)?.owner === owner;
    const promise = Promise.resolve().then(() => {
      if (!current()) throw new SvarLoadCancelled();
      return load(controller.signal);
    }).then(value => {
      if (!current()) throw new SvarLoadCancelled();
      const cached = copy(value);
      if (!current()) throw new SvarLoadCancelled();
      entries.set(key, { kind: 'ready', owner, value: cached }); trim();
      return copy(cached);
    }).catch((failure: unknown) => {
      const active = current();
      if (entries.get(key)?.owner === owner) entries.delete(key);
      if (!active) throw new SvarLoadCancelled();
      throw failure;
    });
    entries.set(key, { kind: 'pending', owner, controller, promise });
    return promise;
  }
  return {
    request, clear,
    invalidate(key: string) {
      const entry = entries.get(key); entries.delete(key);
      if (entry?.kind === 'pending') entry.controller.abort();
    },
    abortPendingExcept(key: string) {
      for (const [id, entry] of entries) {
        if (id !== key && entry.kind === 'pending') { entries.delete(id); entry.controller.abort(); }
      }
    },
    dispose() { disposed = true; clear(); },
  };
}

export function snapshotSvarRecords(items: readonly Record<string, unknown>[], primaryKey = 'id', childrenKey?: string): Record<string, unknown>[] {
  const cloned = snapshotPlainData(items);
  if (!Array.isArray(cloned) || cloned.length > 100_000) throw new Error('Invalid grid records');
  const records = cloned.map(value => decodeBaseRecord(value));
  if (svarRecordIndex(records, primaryKey, childrenKey).size > 100_000) throw new Error('Too many grid records');
  return records;
}

export function checkedSvarRange(event: unknown, total: number): SvarRange {
  if (!Number.isSafeInteger(total) || total < 0 || total > 10_000_000) throw new Error('Invalid total row count');
  const row: unknown = event && typeof event === 'object' ? Object.getOwnPropertyDescriptor(event, 'row')?.value : undefined;
  const start: unknown = row && typeof row === 'object' ? Object.getOwnPropertyDescriptor(row, 'start')?.value : undefined;
  const end: unknown = row && typeof row === 'object' ? Object.getOwnPropertyDescriptor(row, 'end')?.value : undefined;
  if (typeof start !== 'number' || typeof end !== 'number' || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)
    || start < 0 || end < start || end - start > 2048) throw new Error('Invalid grid window');
  return { start: Math.min(start, total), end: Math.min(end, total) };
}

export function snapshotSvarWindow(page: SvarWindowPage, range: SvarRange, primaryKey = 'id'): SvarWindowPage {
  const total: unknown = page && typeof page === 'object' ? Object.getOwnPropertyDescriptor(page, 'total')?.value : undefined;
  const data: unknown = page && typeof page === 'object' ? Object.getOwnPropertyDescriptor(page, 'data')?.value : undefined;
  if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0 || total > 10_000_000 || !Array.isArray(data)
    || data.length !== Math.max(0, Math.min(range.end, total) - range.start)) throw new Error('Invalid window response');
  return { data: snapshotSvarRecords(data, primaryKey), total };
}

export function svarRowId(record: Record<string, unknown>, primaryKey: string): SvarRecordId {
  const id: unknown = Object.getOwnPropertyDescriptor(record, primaryKey)?.value;
  if (typeof id !== 'string' && typeof id !== 'number') throw new Error('Invalid record ID');
  svarRecordKey(id);
  return id;
}

/** 合并已加载分支但不修改 Provider 记录；最后全树验证，拒绝跨分支重复 ID。 */
export function mergeSvarBranches(
  items: readonly Record<string, unknown>[], branches: ReadonlyMap<string, readonly Record<string, unknown>[]>,
  primaryKey: string, childrenKey: string,
): Record<string, unknown>[] {
  if (['__proto__', 'prototype', 'constructor'].includes(childrenKey) || !childrenKey) throw new Error('Invalid children field');
  const copied = snapshotSvarRecords(items, primaryKey, childrenKey);
  let count = 0;
  const ancestors = new Set<string>();
  function visit(records: Record<string, unknown>[], depth: number): Record<string, unknown>[] {
    if (depth > 64) throw new Error('Grid tree is too deep');
    return records.map(record => {
      if (++count > 100_000) throw new Error('Too many grid records');
      const key = svarRecordKey(svarRowId(record, primaryKey));
      if (ancestors.has(key)) throw new Error('Cyclic grid branch');
      const extra = branches.get(key);
      const native: unknown = record[childrenKey];
      const children = extra === undefined ? (Array.isArray(native) ? native.map(decodeBaseRecord) : undefined)
        : snapshotSvarRecords(extra, primaryKey, childrenKey);
      if (children === undefined) return record;
      ancestors.add(key);
      const next = { ...record, [childrenKey]: visit(children, depth + 1) };
      ancestors.delete(key);
      return next;
    });
  }
  const combined = visit(copied, 0);
  svarRecordIndex(combined, primaryKey, childrenKey);
  return combined;
}

/** 占位子节点永远不能被选中或编辑；真正展开前由适配器拦截并加载。 */
export function projectSvarLazyRows(
  records: readonly Record<string, unknown>[], columns: readonly SvarColumn[], primaryKey: string,
  childrenKey: string, hasChildrenKey: string, loaded: ReadonlyMap<string, readonly Record<string, unknown>[]>, opened: ReadonlySet<string>,
): SvarRow[] {
  if (!hasChildrenKey || ['__proto__', 'prototype', 'constructor'].includes(hasChildrenKey)) throw new Error('Invalid branch marker field');
  const index = svarRecordIndex(records, primaryKey, childrenKey);
  const rows = projectSvarRows(records, columns, primaryKey, childrenKey);
  function visit(items: SvarRow[]): void {
    for (const row of items) {
      if (row.data?.length) { row.open = opened.has(row.id); visit(row.data); }
      else {
        const record = index.get(row.id);
        const marker: unknown = record ? Object.getOwnPropertyDescriptor(record, hasChildrenKey)?.value : undefined;
        if (marker === true && !loaded.has(row.id)) { row.data = [{ id: `pending:${row.id}` }]; row.open = false; }
      }
    }
  }
  visit(rows);
  return rows;
}
