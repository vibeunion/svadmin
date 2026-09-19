import type { SvarColumn, SvarEngineColumn, SvarGridApi, SvarGridEngineProps, SvarSort, SvarTextFilter } from './svar-grid-contract.js';
import { checkedSvarColumns, buildSvarColumns, svarColumnId, nextSvarSort, nextSvarFilter, SVAR_BLOCKED_ACTIONS } from './svar-grid-contract.js';
import { svarRecordIndex, svarRecordKey, type SvarRecordId } from './svar-grid-operations.js';

export type SvarValueFormat = 'plain' | 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'boolean';
export interface SvarInteractiveColumn extends SvarColumn {
  readonly editable?: 'text' | 'number';
  readonly format?: SvarValueFormat;
  readonly currency?: string;
}
export interface SvarCellEdit {
  readonly id: SvarRecordId;
  readonly field: string;
  readonly value: string | number;
}
export interface SvarInteractiveApi extends SvarGridApi {
  on(action: string, callback: (event: unknown) => void): void;
  getState(): { selectedRows?: unknown };
}
export interface SvarInteractiveEngineProps extends SvarGridEngineProps {
  columns: (SvarEngineColumn & { editor?: 'text'; template?: (value: unknown) => string })[];
  selectedRows?: (string | number)[];
  init?: (api: SvarInteractiveApi) => void;
}

export function checkedSvarInteractiveColumns(columns: readonly SvarInteractiveColumn[]): SvarInteractiveColumn[] {
  const checked = checkedSvarColumns(columns);
  const formats = new Set(['plain', 'number', 'currency', 'percent', 'date', 'datetime', 'boolean']);
  return checked.map((column, index) => {
    const source = columns[index];
    if (!source) throw new Error('Missing column');
    if (source.editable !== undefined && source.editable !== 'text' && source.editable !== 'number') throw new Error('Invalid editor');
    if (source.format !== undefined && !formats.has(source.format)) throw new Error('Invalid value format');
    if (source.currency !== undefined && !/^[A-Z]{3}$/u.test(source.currency)) throw new Error('Invalid currency');
    return { ...column,
      ...(source.editable === undefined ? {} : { editable: source.editable }),
      ...(source.format === undefined ? {} : { format: source.format }),
      ...(source.currency === undefined ? {} : { currency: source.currency }),
    };
  });
}
export function formatSvarValue(value: unknown, column: SvarInteractiveColumn, locale: string): string {
  if (value == null) return '—';
  const format = column.format ?? 'plain';
  if (format === 'boolean') return value === true ? (locale.startsWith('zh') ? '是' : 'Yes') : value === false ? (locale.startsWith('zh') ? '否' : 'No') : '—';
  if (format === 'number' || format === 'currency' || format === 'percent') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
    const options: Intl.NumberFormatOptions = format === 'currency'
      ? { style: 'currency', currency: column.currency ?? 'USD' }
      : format === 'percent' ? { style: 'percent', maximumFractionDigits: 2 } : {};
    return new Intl.NumberFormat(locale, options).format(value);
  }
  if (format === 'date' || format === 'datetime') {
    if (typeof value !== 'string' && typeof value !== 'number') return '—';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    return new Intl.DateTimeFormat(locale, format === 'date' ? { dateStyle: 'medium', timeZone: 'UTC' } : { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date);
  }
  return typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)) ? String(value) : '—';
}
export function buildSvarInteractiveColumns(columns: readonly SvarInteractiveColumn[], tree: boolean, editable: boolean, locale: string): SvarInteractiveEngineProps['columns'] {
  return buildSvarColumns(columns, tree).map((column, index) => {
    const source = columns[index];
    if (!source) throw new Error('Missing column');
    return { ...column,
      ...(source.editable && editable ? { editor: 'text' as const } : {}),
      ...(source.format ? { template: (value: unknown) => formatSvarValue(value, source, locale) } : {}),
    };
  });
}
function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
export function resolveSvarCell(event: unknown, columns: readonly SvarInteractiveColumn[], index: Map<string, Record<string, unknown>>, primaryKey: string): { id: SvarRecordId; column: SvarInteractiveColumn } | undefined {
  const ev = record(event);
  if (!ev || typeof ev['id'] !== 'string') return;
  const source = index.get(ev['id']);
  const column = columns.find(item => svarColumnId(item.key) === ev['column'] && item.editable && item.key !== primaryKey && item.key !== 'id');
  const id: unknown = source ? Object.getOwnPropertyDescriptor(source, primaryKey)?.value : undefined;
  if (!column || (typeof id !== 'string' && typeof id !== 'number')) return;
  return { id, column };
}
export function parseSvarCellEdit(event: unknown, columns: readonly SvarInteractiveColumn[], index: Map<string, Record<string, unknown>>, primaryKey: string): SvarCellEdit | undefined {
  const ev = record(event);
  const cell = resolveSvarCell(event, columns, index, primaryKey);
  if (!cell || !ev) return;
  const raw = ev['value'];
  let value: string | number;
  if (cell.column.editable === 'number') {
    if (typeof raw !== 'string' && typeof raw !== 'number') throw new Error('Invalid number');
    if (typeof raw === 'string' && !raw.trim()) throw new Error('A number is required');
    value = Number(raw);
    if (!Number.isFinite(value)) throw new Error('Invalid number');
  } else {
    if (typeof raw !== 'string') throw new Error('Text is required');
    value = raw;
  }
  return { id: cell.id, field: cell.column.key, value };
}

/** 引擎永远不能自行写业务数据；编辑只生成宿主请求，成功后由查询数据回填。 */
export function installSvarInteractions(api: SvarInteractiveApi, options: {
  current: () => boolean;
  columns: () => readonly SvarInteractiveColumn[];
  items: () => readonly Record<string, unknown>[];
  primaryKey: () => string;
  childrenKey: () => string | undefined;
  server: () => boolean;
  sorters: () => readonly SvarSort[];
  filters: () => readonly SvarTextFilter[];
  sort: (sorters: SvarSort[]) => void;
  filter: (filters: SvarTextFilter[]) => void;
  editable: () => boolean;
  edit: (edit: SvarCellEdit) => void;
  selectable: () => boolean;
  selection: (ids: SvarRecordId[]) => void;
  error: (message: string) => void;
}): void {
  const index = () => svarRecordIndex(options.items(), options.primaryKey(), options.childrenKey());
  for (const action of SVAR_BLOCKED_ACTIONS) {
    if (!['open-editor', 'editor', 'update-cell'].includes(action)) api.intercept(action, () => false);
  }
  api.intercept('open-editor', event => {
    if (!options.current() || !options.editable()) return false;
    try { if (!resolveSvarCell(event, options.columns(), index(), options.primaryKey())) return false; }
    catch { return false; }
  });
  api.intercept('editor', () => { if (!options.current() || !options.editable()) return false; });
  api.intercept('update-cell', event => {
    if (options.current() && options.editable()) {
      try {
        const edit = parseSvarCellEdit(event, options.columns(), index(), options.primaryKey());
        if (edit) options.edit(edit);
      } catch (failure) { options.error(failure instanceof Error ? failure.message : 'Invalid edit'); }
    }
    return false;
  });
  api.intercept('select-row', () => { if (!options.current() || !options.selectable()) return false; });
  api.on('select-row', () => {
    if (!options.current() || !options.selectable()) return;
    const selected = api.getState().selectedRows;
    if (!Array.isArray(selected)) return;
    try {
      const records = index();
      const ids = selected.flatMap(key => {
        const source = typeof key === 'string' ? records.get(key) : undefined;
        const id: unknown = source ? Object.getOwnPropertyDescriptor(source, options.primaryKey())?.value : undefined;
        return typeof id === 'string' || typeof id === 'number' ? [id] : [];
      });
      if (ids.length > 100) { options.error('Select at most 100 records'); return; }
      options.selection(ids);
    } catch { options.selection([]); }
  });
  api.intercept('sort-rows', event => {
    if (!options.current()) return false;
    if (options.server()) {
      const next = nextSvarSort(event, options.columns(), options.sorters());
      if (next) options.sort(next);
      return false;
    }
  });
  api.intercept('filter-rows', event => {
    if (!options.current()) return false;
    if (options.server()) {
      const next = nextSvarFilter(event, options.columns(), options.filters());
      if (next) options.filter(next);
      return false;
    }
  });
}
export { svarRecordKey };
