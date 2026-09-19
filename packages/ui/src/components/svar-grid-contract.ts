/** SVAR 2.7 的窄适配契约。应用注入 Grid，未启用的页面无需安装或加载 SVAR。 */
export interface SvarColumn {
  readonly key: string;
  readonly label: string;
  readonly width?: number;
  readonly sortable?: boolean;
  /** 首批内建列过滤只支持文本 contains；其他过滤通过资源 filters 传入。 */
  readonly filterable?: boolean;
}
export interface SvarSort { readonly field: string; readonly order: 'asc' | 'desc' }
export interface SvarTextFilter { readonly field: string; readonly operator: 'contains'; readonly value: string }
export interface SvarRow { id: string; data?: SvarRow[]; open?: boolean; [key: string]: unknown }
export interface SvarEngineColumn {
  id: string;
  header: string | (string | { filter: 'text' })[];
  width?: number;
  flexgrow?: number;
  sort: boolean;
  resize: boolean;
  treetoggle: boolean;
}
export interface SvarGridApi {
  intercept(action: string, callback: (event: unknown) => false | undefined): void;
}
/** 仅使用已核对的上游属性；不暴露任意 editor、template 或事件执行入口。 */
export interface SvarGridEngineProps {
  /** 上游声明带事件索引；适配层不直接转发任何事件 prop。 */
  [event: `on${string}`]: never;
  columns: SvarEngineColumn[];
  data?: SvarRow[];
  tree?: boolean;
  split?: { left?: number };
  sizes?: { rowHeight?: number; headerHeight?: number; columnWidth?: number };
  sortMarks?: Record<string, { order: 'asc' | 'desc'; index?: number }>;
  filterValues?: Record<string, string>;
  select?: boolean;
  multiselect?: boolean;
  reorder?: boolean;
  draggableRows?: boolean;
  undo?: boolean;
  init?: (api: SvarGridApi) => void;
}

const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
function fieldName(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !forbidden.has(value);
}
export function svarColumnId(key: string): string {
  return `column:${encodeURIComponent(key)}`;
}
export function checkedSvarColumns(columns: readonly SvarColumn[]): SvarColumn[] {
  if (!Array.isArray(columns) || columns.length === 0) throw new Error('At least one grid column is required');
  const ids = new Set<string>();
  return columns.map(column => {
    if (!column || !fieldName(column.key) || typeof column.label !== 'string' || ids.has(column.key)) {
      throw new Error('Invalid or duplicate grid column');
    }
    if (column.width !== undefined && (!Number.isFinite(column.width) || column.width < 40 || column.width > 4096)) {
      throw new Error('Grid column width must be between 40 and 4096');
    }
    ids.add(column.key);
    // 显式投影，拒绝将宿主对象上的 editor/template 等额外属性传入 Grid。
    return {
      key: column.key, label: column.label,
      sortable: column.sortable === true, filterable: column.filterable === true,
      ...(column.width === undefined ? {} : { width: column.width }),
    };
  });
}
export function buildSvarColumns(columns: readonly SvarColumn[], tree: boolean): SvarEngineColumn[] {
  return columns.map((column, index) => ({
    id: svarColumnId(column.key),
    header: column.filterable ? [column.label, { filter: 'text' }] : column.label,
    ...(column.width === undefined ? { flexgrow: 1 } : { width: column.width }),
    sort: column.sortable === true, resize: true, treetoggle: tree && index === 0,
  }));
}
function ownValue(record: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor) return undefined;
  if (!('value' in descriptor)) throw new Error('Grid records must not contain accessors');
  return descriptor.value;
}
function scalar(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  // 复杂字段需要独立格式化；不隐式调用用户对象的 toString/toJSON。
  return '—';
}
export function projectSvarRows(
  items: readonly Record<string, unknown>[],
  columns: readonly SvarColumn[],
  primaryKey = 'id',
  childrenKey?: string,
): SvarRow[] {
  if (!Array.isArray(items) || !fieldName(primaryKey) || (childrenKey !== undefined && !fieldName(childrenKey))) {
    throw new Error('Invalid grid data configuration');
  }
  const ids = new Set<string>();
  const ancestors = new Set<object>();
  function visit(rows: readonly Record<string, unknown>[], depth: number): SvarRow[] {
    if (depth > 64) throw new Error('Grid tree is too deep');
    return rows.map(record => {
      if (!record || typeof record !== 'object' || Array.isArray(record) || ancestors.has(record)) {
        throw new Error('Invalid or cyclic grid record');
      }
      const id = ownValue(record, primaryKey);
      if (!(typeof id === 'string' && id.length > 0) && !(typeof id === 'number' && Number.isFinite(id))) {
        throw new Error('Every grid record requires a stable string or finite number ID');
      }
      // SVAR 内部 ID 使用字符串；防止数字 1 与字符串 "1" 相互覆盖。
      const key = `${typeof id === 'number' ? 'n' : 's'}:${id}`;
      if (ids.has(key)) throw new Error('Duplicate grid record ID');
      ids.add(key);
      const row: SvarRow = { id: key };
      for (const column of columns) row[svarColumnId(column.key)] = scalar(ownValue(record, column.key));
      if (childrenKey !== undefined) {
        const children = ownValue(record, childrenKey);
        if (children !== undefined && !Array.isArray(children)) throw new Error('Grid children must be an array');
        if (Array.isArray(children) && children.length) {
          ancestors.add(record);
          row.data = visit(children, depth + 1);
          ancestors.delete(record);
          row.open = false;
        }
      }
      return row;
    });
  }
  return visit(items, 0);
}
function eventRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
export function nextSvarSort(
  event: unknown, columns: readonly SvarColumn[], current: readonly SvarSort[],
): SvarSort[] | undefined {
  const value = eventRecord(event);
  if (!value || (value['order'] !== undefined && value['order'] !== 'asc' && value['order'] !== 'desc')
    || (value['add'] !== undefined && typeof value['add'] !== 'boolean')) return undefined;
  const column = columns.find(column => svarColumnId(column.key) === value['key'] && column.sortable);
  if (!column) return undefined;
  const existing = current.find(sort => sort.field === column.key);
  const order = value['order'] ?? (existing?.order === 'asc' ? 'desc' : 'asc');
  const next = value['add'] ? current.map(sort => ({ ...sort })) : [];
  const index = next.findIndex(sort => sort.field === column.key);
  const sort: SvarSort = { field: column.key, order };
  if (index < 0) next.push(sort); else next[index] = sort;
  return next;
}
export function nextSvarFilter(
  event: unknown, columns: readonly SvarColumn[], current: readonly SvarTextFilter[],
): SvarTextFilter[] | undefined {
  const value = eventRecord(event);
  if (!value || (value['value'] != null && typeof value['value'] !== 'string')) return undefined;
  const column = columns.find(column => svarColumnId(column.key) === value['key'] && column.filterable);
  if (!column) return undefined;
  const next = current.filter(filter => filter.field !== column.key).map(filter => ({ ...filter }));
  if (typeof value['value'] === 'string' && value['value'] !== '') {
    next.push({ field: column.key, operator: 'contains', value: value['value'] });
  }
  return next;
}
export function svarSortMarks(sorters: readonly SvarSort[]): NonNullable<SvarGridEngineProps['sortMarks']> {
  return Object.fromEntries(sorters.map((sort, index) => [svarColumnId(sort.field), { order: sort.order, index }]));
}
export function svarFilterValues(filters: readonly SvarTextFilter[]): Record<string, string> {
  return Object.fromEntries(filters.map(filter => [svarColumnId(filter.field), filter.value]));
}

export const SVAR_BLOCKED_ACTIONS = [
  'add-row', 'delete-row', 'update-row', 'update-cell', 'copy-row', 'move-item',
  'open-editor', 'editor', 'undo', 'redo', 'export-data', 'print',
] as const;
export function installSvarGuards(api: SvarGridApi, options: {
  current: () => boolean;
  server: () => boolean;
  sort: (event: unknown) => void;
  filter: (event: unknown) => void;
}): void {
  for (const action of SVAR_BLOCKED_ACTIONS) api.intercept(action, () => false);
  api.intercept('sort-rows', event => {
    if (!options.current()) return false;
    if (options.server()) { options.sort(event); return false; }
  });
  api.intercept('filter-rows', event => {
    if (!options.current()) return false;
    if (options.server()) { options.filter(event); return false; }
  });
}
