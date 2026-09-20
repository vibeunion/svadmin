import type { SvarColumn, SvarRow } from './svar-grid-contract.js';
import { checkedSvarColumns, projectSvarRows, svarColumnId } from './svar-grid-contract.js';

export type SvarRecordId = string | number;
export interface SvarBatchResult {
  readonly succeeded: SvarRecordId[];
  readonly failed: { id: SvarRecordId; message: string; uncertain: boolean }[];
  readonly skipped: SvarRecordId[];
  readonly cancelled: boolean;
}

export function svarRecordKey(id: SvarRecordId): string {
  if ((typeof id !== 'string' || id.length === 0) && (typeof id !== 'number' || !Number.isFinite(id))) {
    throw new Error('Invalid record ID');
  }
  return `${typeof id === 'number' ? 'n' : 's'}:${id}`;
}

/** 不解析引擎字符串推测业务 ID，必须从当前已授权记录建立映射。 */
export function svarRecordIndex(items: readonly Record<string, unknown>[], primaryKey = 'id', childrenKey?: string): Map<string, Record<string, unknown>> {
  const index = new Map<string, Record<string, unknown>>();
  const ancestors = new Set<object>();
  function visit(records: readonly Record<string, unknown>[], depth: number): void {
    if (!Array.isArray(records) || depth > 64) throw new Error('Invalid grid tree');
    for (const record of records) {
      if (!record || typeof record !== 'object' || Array.isArray(record) || ancestors.has(record)) throw new Error('Invalid grid tree');
      const descriptor = Object.getOwnPropertyDescriptor(record, primaryKey);
      const id: unknown = descriptor && 'value' in descriptor ? descriptor.value : undefined;
      if (typeof id !== 'string' && typeof id !== 'number') throw new Error('Invalid record ID');
      const key = svarRecordKey(id);
      if (index.has(key)) throw new Error('Duplicate record ID');
      index.set(key, record);
      if (childrenKey) {
        const childDescriptor = Object.getOwnPropertyDescriptor(record, childrenKey);
        if (childDescriptor && !('value' in childDescriptor)) throw new Error('Accessors are not allowed');
        const children: unknown = childDescriptor?.value;
        if (children !== undefined && !Array.isArray(children)) throw new Error('Invalid child records');
        if (Array.isArray(children)) {
          ancestors.add(record);
          visit(children, depth + 1);
          ancestors.delete(record);
        }
      }
    }
  }
  visit(items, 0);
  return index;
}

export function checkedSvarSelection(ids: readonly SvarRecordId[], max = 100): SvarRecordId[] {
  if (!Array.isArray(ids) || ids.length > max) throw new Error(`Select at most ${max} records`);
  const seen = new Set<string>();
  return ids.filter(id => {
    const key = svarRecordKey(id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 整批预检后逐条重新授权；部分成功不是事务回滚，会话变更后停止派发。 */
export async function runSvarBatch(options: {
  ids: readonly SvarRecordId[];
  current: () => boolean;
  authorize: (id: SvarRecordId) => Promise<boolean>;
  write: (id: SvarRecordId) => Promise<unknown>;
}): Promise<SvarBatchResult> {
  const ids = checkedSvarSelection(options.ids);
  const succeeded: SvarRecordId[] = [];
  const failed: { id: SvarRecordId; message: string; uncertain: boolean }[] = [];
  let cancelled = false;
  for (const id of ids) {
    if (!options.current()) return { succeeded, failed, skipped: ids, cancelled: true };
    const allowed = await options.authorize(id).catch(() => false);
    if (!options.current()) return { succeeded, failed, skipped: ids, cancelled: true };
    if (!allowed) return { succeeded, failed: [{ id, message: 'Access denied', uncertain: false }], skipped: ids.filter(value => !Object.is(value, id)), cancelled: false };
  }
  for (const id of ids) {
    if (!options.current()) { cancelled = true; break; }
    const allowed = await options.authorize(id).catch(() => false);
    if (!options.current()) { cancelled = true; break; }
    if (!allowed) { failed.push({ id, message: 'Access denied', uncertain: false }); continue; }
    try {
      await options.write(id);
      succeeded.push(id);
    } catch (error) {
      const details: unknown = error && typeof error === 'object' ? Object.getOwnPropertyDescriptor(error, 'details')?.value : undefined;
      const known: unknown = details && typeof details === 'object' ? Object.getOwnPropertyDescriptor(details, 'writeMayHaveSucceeded')?.value : undefined;
      failed.push({ id, message: 'Operation failed; refresh before retrying', uncertain: known !== false });
    }
    if (!options.current()) { cancelled = true; break; }
  }
  const attempted = new Set([...succeeded, ...failed.map(item => item.id)].map(svarRecordKey));
  return { succeeded, failed, skipped: ids.filter(id => !attempted.has(svarRecordKey(id))), cancelled };
}

function hasFormulaPrefix(text: string): boolean {
  if (text.startsWith('\t') || text.startsWith('\r') || text.startsWith('\n')) return true;
  let offset = 0;
  while (offset < text.length) {
    const character = text[offset] ?? '';
    if (text.charCodeAt(offset) <= 31 || /\s/u.test(character)) offset++;
    else break;
  }
  const first = text[offset];
  return first !== undefined && '=+@-'.includes(first);
}

/** 导出只接受显式投影后的标量值；不调用对象的 toString/toJSON。 */
export function svarCsv(rows: readonly SvarRow[], columns: readonly SvarColumn[]): string {
  const cell = (value: unknown): string => {
    let text = typeof value === 'string' ? value
      : typeof value === 'number' && Number.isFinite(value) ? String(value)
      : typeof value === 'boolean' ? String(value) : '';
    if (typeof value === 'string' && hasFormulaPrefix(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const lines = [columns.map(column => cell(column.label)).join(',')];
  let count = 0;
  const ancestors = new Set<SvarRow>();
  function visit(records: readonly SvarRow[], depth: number): void {
    if (depth > 64) throw new Error('Export tree is too deep');
    for (const row of records) {
      if (++count > 100_000 || ancestors.has(row)) throw new Error('Invalid or oversized export');
      lines.push(columns.map(column => cell(row[svarColumnId(column.key)])).join(','));
      if (row.data) {
        ancestors.add(row);
        visit(row.data, depth + 1);
        ancestors.delete(row);
      }
    }
  }
  visit(rows, 0);
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export interface SvarExportSnapshot {
  readonly ids: readonly SvarRecordId[];
  readonly csv: string;
}

/** 在首次 await 之前冻结完整导出内容与所有后代 ID，避免检查与导出对象不一致。 */
export function prepareSvarExport(
  items: readonly Record<string, unknown>[], columns: readonly SvarColumn[], primaryKey = 'id', childrenKey?: string,
): SvarExportSnapshot {
  const checked = checkedSvarColumns(columns);
  const index = svarRecordIndex(items, primaryKey, childrenKey);
  const ids: SvarRecordId[] = [];
  for (const record of index.values()) {
    const id: unknown = Object.getOwnPropertyDescriptor(record, primaryKey)?.value;
    if (typeof id !== 'string' && typeof id !== 'number') throw new Error('Invalid record ID');
    ids.push(id);
  }
  const csv = svarCsv(projectSvarRows(items, checked, primaryKey, childrenKey), checked);
  return Object.freeze({ ids: Object.freeze(ids), csv });
}

/** 只授权已经冻结的快照；禁止只检查树根，或在权限等待结束后读取新数据。 */
export async function authorizeSvarExport(snapshot: SvarExportSnapshot, options: {
  current: () => boolean;
  authorize: (action: 'list' | 'export', id: SvarRecordId | undefined) => Promise<boolean>;
}): Promise<string> {
  async function check(action: 'list' | 'export', id?: SvarRecordId): Promise<void> {
    if (!options.current()) throw new Error('Export scope changed');
    const allowed = await options.authorize(action, id);
    if (!options.current() || !allowed) throw new Error('Export access denied');
  }
  await check('list');
  await check('export');
  for (const id of snapshot.ids) await check('export', id);
  if (!options.current()) throw new Error('Export scope changed');
  return snapshot.csv;
}

export function downloadSvarCsv(content: string, resourceName: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${resourceName.replace(/[^a-zA-Z0-9_-]/gu, '_').slice(0, 80) || 'records'}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
