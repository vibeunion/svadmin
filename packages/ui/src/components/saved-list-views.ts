import { snapshotPlainData } from '@svadmin/core/schema';
import type { CrudOperator, Filter, Sort } from '@svadmin/core';

const STORAGE_VERSION = 1;
const MAX_SAVED_VIEWS = 25;
const MAX_FILTER_NODES = 200;
const CRUD_OPERATORS = new Set([
  'eq', 'ne', 'lt', 'gt', 'lte', 'gte',
  'contains', 'ncontains', 'startswith', 'endswith',
  'in', 'nin', 'null', 'nnull', 'between', 'nbetween',
]);

export interface SavedListViewState {
  search: string;
  filters: Filter[];
  sorters: Sort[];
  pagination: {
    current: number;
    pageSize: number;
  };
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
}

export interface SavedListView {
  id: string;
  name: string;
  state: SavedListViewState;
  version?: number;
  source?: 'local' | 'team' | 'system';
  readOnly?: boolean;
  default?: boolean;
  access?: SavedListViewAccess;
}

export type SavedListViewAccessMode = 'team' | 'organization' | 'restricted';
export interface SavedListViewAccess {
  mode: SavedListViewAccessMode;
  subjectIds: string[];
}

export interface SavedListViewSubject {
  id: string;
  label: string;
  description?: string;
}

export interface SavedListViewMutation {
  id: string;
  name: string;
  state: SavedListViewState;
  /** null 仅允许创建；更新必须提供读取到的版本。 */
  expectedVersion: number | null;
  source: 'team' | 'system';
}

export interface SavedListViewMutationSuccess {
  ok: true;
  view: SavedListView;
  version: number;
}

export interface SavedListViewMutationConflict {
  ok: false;
  code: 'VERSION_CONFLICT';
  current: SavedListView;
  version: number;
}

export interface SavedListViewRemoveSuccess {
  ok: true;
  id: string;
  version: number;
}

export interface SavedListViewProvider {
  list: (scope: ListPreferenceScope) => Promise<unknown>;
  /** 可选的成员目录查询；授权仍由宿主服务端负责。 */
  listAccessSubjects?: (scope: ListPreferenceScope, input: {
    query?: string;
    limit?: number;
  }) => Promise<unknown>;
  save?: (scope: ListPreferenceScope, mutation: SavedListViewMutation) => Promise<unknown>;
  remove?: (scope: ListPreferenceScope, input: { id: string; expectedVersion: number }) => Promise<unknown>;
  setDefault?: (scope: ListPreferenceScope, input: {
    id: string;
    source: 'team' | 'system';
    expectedVersion: number;
    default: boolean;
  }) => Promise<unknown>;
  updateAccess?: (scope: ListPreferenceScope, input: {
    id: string;
    source: 'team' | 'system';
    expectedVersion: number;
    access: SavedListViewAccess;
  }) => Promise<unknown>;
}

export interface ListPreferenceScope {
  resourceName: string;
  providerName: string;
  tenantIdentity?: string | number;
  identityKey?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= max;
}

function parseFilter(
  value: unknown,
  allowedFieldIds: Set<string>,
  budget: { remaining: number },
  depth = 0,
): Filter | undefined {
  if (depth > 20 || budget.remaining-- <= 0 || !isRecord(value)) return undefined;

  if (typeof value['field'] === 'string') {
    if (!allowedFieldIds.has(value['field']) || typeof value['operator'] !== 'string' || !CRUD_OPERATORS.has(value['operator']) || !('value' in value)) {
      return undefined;
    }
    return {
      field: value['field'],
      operator: value['operator'] as CrudOperator,
      value: value['value'],
    } as Filter;
  }

  if ((value['operator'] !== 'and' && value['operator'] !== 'or') || !Array.isArray(value['value'])) return undefined;
  const children = value['value'].map((entry) => parseFilter(entry, allowedFieldIds, budget, depth + 1));
  if (children.some((entry) => entry === undefined)) return undefined;
  return { operator: value['operator'], value: children as Filter[] };
}

function parseSorters(value: unknown[], allowedFieldIds: Set<string>): Sort[] | undefined {
  const sorters: Sort[] = [];
  for (const sorter of value) {
    if (!isRecord(sorter) || typeof sorter['field'] !== 'string' || !allowedFieldIds.has(sorter['field'])) return undefined;
    if (sorter['order'] !== 'asc' && sorter['order'] !== 'desc') return undefined;
    sorters.push({ field: sorter['field'], order: sorter['order'] });
  }
  return sorters;
}

function parseColumnVisibility(value: unknown, allowedColumnIds: Set<string>): Record<string, boolean> | undefined {
  if (!isRecord(value)) return undefined;
  const visibility: Record<string, boolean> = {};
  for (const [columnId, visible] of Object.entries(value)) {
    if (!allowedColumnIds.has(columnId) || typeof visible !== 'boolean') continue;
    visibility[columnId] = visible;
  }
  return visibility;
}

function parseColumnOrder(value: unknown, allowedColumnIds: Set<string>): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return [...new Set(value.filter((columnId): columnId is string => (
    typeof columnId === 'string' && allowedColumnIds.has(columnId)
  )))];
}

function parseState(value: unknown, allowedColumnIds: Set<string>): SavedListViewState | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value['search'] !== 'string' || value['search'].length > 1_000) return undefined;
  if (!Array.isArray(value['filters']) || !Array.isArray(value['sorters'])) return undefined;
  if (!isRecord(value['pagination']) || !isPositiveInteger(value['pagination']['current'], 1_000_000) || !isPositiveInteger(value['pagination']['pageSize'], 1_000)) {
    return undefined;
  }

  const allowedFieldIds = new Set([...allowedColumnIds].filter((columnId) => !columnId.startsWith('_')));
  const filterBudget = { remaining: MAX_FILTER_NODES };
  const filters = value['filters'].map((entry) => parseFilter(entry, allowedFieldIds, filterBudget));
  if (filters.some((entry) => entry === undefined)) return undefined;
  const sorters = parseSorters(value['sorters'], allowedFieldIds);
  const columnVisibility = parseColumnVisibility(value['columnVisibility'], allowedColumnIds);
  const columnOrder = parseColumnOrder(value['columnOrder'], allowedColumnIds);
  if (!sorters || !columnVisibility || !columnOrder) return undefined;

  return {
    search: value['search'],
    filters: filters as Filter[],
    sorters,
    pagination: {
      current: value['pagination']['current'],
      pageSize: value['pagination']['pageSize'],
    },
    columnVisibility,
    columnOrder,
  };
}

function parseAccess(value: unknown): SavedListViewAccess | undefined {
  if (!isRecord(value) || Object.keys(value).some(key => key !== 'mode' && key !== 'subjectIds')) return;
  const mode = value['mode'];
  const ids = value['subjectIds'];
  if ((mode !== 'team' && mode !== 'organization' && mode !== 'restricted')
    || !Array.isArray(ids) || ids.length > 200) return;
  const subjectIds: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string' || !id.trim() || id !== id.trim() || id.length > 200
      || subjectIds.includes(id)) return;
    subjectIds.push(id);
  }
  if ((mode === 'restricted') !== (subjectIds.length > 0)) return;
  return { mode, subjectIds };
}

export function decodeSavedListViewAccess(value: unknown): SavedListViewAccess | undefined {
  try { return parseAccess(snapshotPlainData(value)); } catch { return; }
}

export function decodeSavedListViewSubjects(value: unknown): SavedListViewSubject[] | undefined {
  try {
    const snapshot = snapshotPlainData(value);
    if (!Array.isArray(snapshot) || snapshot.length > 200) return;
    const seen = new Set<string>();
    const subjects: SavedListViewSubject[] = [];
    for (const entry of snapshot) {
      if (!isRecord(entry)
        || Object.keys(entry).some(key => !['id', 'label', 'description'].includes(key))
        || typeof entry['id'] !== 'string' || !entry['id'].trim() || entry['id'] !== entry['id'].trim()
        || entry['id'].length > 200 || seen.has(entry['id'])
        || typeof entry['label'] !== 'string' || !entry['label'].trim() || entry['label'].length > 200
        || (entry['description'] !== undefined
          && (typeof entry['description'] !== 'string' || entry['description'].length > 500))) return;
      seen.add(entry['id']);
      subjects.push({
        id: entry['id'],
        label: entry['label'].trim(),
        ...(entry['description'] === undefined ? {} : { description: entry['description'] }),
      });
    }
    return subjects;
  } catch {
    return;
  }
}

export function readSavedListViews(
  raw: string | null, allowedColumnIds: Set<string>, source: SavedListView['source'] = 'local',
): SavedListView[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed['version'] !== STORAGE_VERSION || !Array.isArray(parsed['views'])) return [];

    const views: SavedListView[] = [];
    const seenIds = new Set<string>();
    for (const entry of parsed['views'].slice(0, MAX_SAVED_VIEWS)) {
      if (!isRecord(entry) || typeof entry['id'] !== 'string' || !entry['id'].trim() || entry['id'].length > 120) continue;
      if (seenIds.has(entry['id'])) continue;
      if (typeof entry['name'] !== 'string' || !entry['name'].trim() || entry['name'].length > 60) continue;
      const state = parseState(entry['state'], allowedColumnIds);
      if (!state) continue;
      const access = entry['access'] === undefined ? undefined : parseAccess(entry['access']);
      if (entry['access'] !== undefined && !access) continue;
      seenIds.add(entry['id']);
      views.push({
        id: entry['id'], name: entry['name'].trim(), state,
        ...(isPositiveInteger(entry['version'], Number.MAX_SAFE_INTEGER) ? { version: entry['version'] } : {}),
        ...(source !== 'local' ? {
          source: entry['source'] === 'system' ? 'system' as const : 'team' as const,
          readOnly: true,
          ...(entry['default'] === true ? { default: true } : {}),
          ...(access === undefined ? {} : { access }),
        } : {}),
      });
    }
    return views;
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
}

export function decodeSavedListViewMutationResult(
  value: unknown, allowedColumnIds: Set<string>,
  expected?: Pick<SavedListViewMutation, 'id' | 'source' | 'expectedVersion'>,
): SavedListViewMutationSuccess | SavedListViewMutationConflict | undefined {
  try {
    if (expected && (!expected.id.trim()
      || !['team', 'system'].includes(expected.source)
      || (expected.expectedVersion !== null
        && !isPositiveInteger(expected.expectedVersion, Number.MAX_SAFE_INTEGER)))) return;
    const snapshot = snapshotPlainData(value);
    if (!isRecord(snapshot) || typeof snapshot['ok'] !== 'boolean') return;
    const keys = snapshot['ok'] ? ['ok', 'version', 'view'] : ['ok', 'code', 'version', 'current'];
    if (Object.keys(snapshot).some(key => !keys.includes(key))) return;
    const parseReceiptView = (candidate: unknown, version: number): SavedListView | undefined => {
      if (!isRecord(candidate)
        || Object.keys(candidate).some(key => !['id', 'name', 'state', 'version', 'source', 'readOnly', 'default', 'access'].includes(key))
        || candidate['version'] !== version
        || (candidate['readOnly'] !== undefined && typeof candidate['readOnly'] !== 'boolean')
        || (candidate['default'] !== undefined && typeof candidate['default'] !== 'boolean')
        || (candidate['source'] !== undefined && candidate['source'] !== 'team' && candidate['source'] !== 'system')) return;
      const access = candidate['access'] === undefined ? undefined : parseAccess(candidate['access']);
      if (candidate['access'] !== undefined && !access) return;
      const state = candidate['state'];
      if (!isRecord(state) || Object.keys(state).some(key =>
        !['search', 'filters', 'sorters', 'pagination', 'columnVisibility', 'columnOrder'].includes(key))) return;
      if (!isRecord(state['pagination']) || Object.keys(state['pagination']).some(key =>
        !['current', 'pageSize'].includes(key))) return;
      if (!isRecord(state['columnVisibility']) || Object.entries(state['columnVisibility'])
        .some(([key, visible]) => !allowedColumnIds.has(key) || typeof visible !== 'boolean')) return;
      if (!Array.isArray(state['columnOrder']) || state['columnOrder'].some(key =>
        typeof key !== 'string' || !allowedColumnIds.has(key))
        || new Set(state['columnOrder']).size !== state['columnOrder'].length) return;
      if (!Array.isArray(state['sorters']) || state['sorters'].some(sorter =>
        !isRecord(sorter) || Object.keys(sorter).some(key => !['field', 'order'].includes(key)))) return;
      const exactFilter = (filter: unknown, depth = 0): boolean => {
        if (!isRecord(filter) || depth > 20) return false;
        if ('field' in filter) return Object.keys(filter).every(key => ['field', 'operator', 'value'].includes(key));
        return Object.keys(filter).every(key => ['operator', 'value'].includes(key))
          && Array.isArray(filter['value']) && filter['value'].every(child => exactFilter(child, depth + 1));
      };
      if (!Array.isArray(state['filters']) || !state['filters'].every(filter => exactFilter(filter))) return;
      const views = readSavedListViews(JSON.stringify({ version: STORAGE_VERSION, views: [candidate] }), allowedColumnIds);
      const view = views[0];
      if (!view || view.name !== candidate['name']) return;
      if (expected && (view.id !== expected.id || candidate['source'] !== expected.source)) return;
      return {
        ...view,
        ...(candidate['source'] === undefined ? {} : { source: candidate['source'] }),
        ...(candidate['readOnly'] === undefined ? {} : { readOnly: candidate['readOnly'] }),
        ...(candidate['default'] === undefined ? {} : { default: candidate['default'] }),
        ...(access === undefined ? {} : { access }),
      };
    };
    if (snapshot['ok'] === true) {
      if (!isPositiveInteger(snapshot['version'], Number.MAX_SAFE_INTEGER)) return;
      if (expected?.expectedVersion !== undefined && expected.expectedVersion !== null
        && snapshot['version'] <= expected.expectedVersion) return;
      const view = parseReceiptView(snapshot['view'], snapshot['version']);
      if (!view) return;
      return { ok: true, view, version: snapshot['version'] };
    }
    if (snapshot['code'] !== 'VERSION_CONFLICT' || !isPositiveInteger(snapshot['version'], Number.MAX_SAFE_INTEGER)) return;
    const current = parseReceiptView(snapshot['current'], snapshot['version']);
    if (!current) return;
    return { ok: false, code: 'VERSION_CONFLICT', current, version: snapshot['version'] };
  } catch {
    return;
  }
}

export function decodeSavedListViewRemoveResult(
  value: unknown, expected: { id: string; expectedVersion: number },
): SavedListViewRemoveSuccess | undefined {
  try {
    const snapshot = snapshotPlainData(value);
    if (!isRecord(snapshot) || snapshot['ok'] !== true
      || Object.keys(snapshot).some(key => !['ok', 'id', 'version'].includes(key))
      || snapshot['id'] !== expected.id
      || !isPositiveInteger(expected.expectedVersion, Number.MAX_SAFE_INTEGER)
      || !isPositiveInteger(snapshot['version'], Number.MAX_SAFE_INTEGER)
      || snapshot['version'] <= expected.expectedVersion) return;
    return { ok: true, id: expected.id, version: snapshot['version'] };
  } catch {
    return;
  }
}

export function decodeRemoteSavedListViews(
  value: unknown, allowedColumnIds: Set<string>,
  writable = false,
): SavedListView[] {
  try {
    const snapshot = snapshotPlainData(value);
    if (!Array.isArray(snapshot)) return [];
    return readSavedListViews(JSON.stringify({ version: STORAGE_VERSION, views: snapshot }), allowedColumnIds, 'team')
      .map(view => {
        const entry = snapshot.find(entry => isRecord(entry) && entry['id'] === view.id);
        return {
          ...view,
          readOnly: !writable || !view.version || !isRecord(entry) || entry['readOnly'] !== false,
          ...(isRecord(entry) && entry['default'] === true ? { default: true } : {}),
        };
      });
  } catch {
    return [];
  }
}

export function serializeSavedListViews(views: SavedListView[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, views: views.slice(0, MAX_SAVED_VIEWS) });
}

export function cloneSavedListViewState(state: SavedListViewState): SavedListViewState {
  return JSON.parse(JSON.stringify(state)) as SavedListViewState;
}

function encodeScopeValue(value: string | number | undefined): string {
  if (value === undefined) return 'u';
  return `${typeof value === 'number' ? 'n' : 's'}:${encodeURIComponent(String(value))}`;
}

export function listPreferenceScopeId(scope: ListPreferenceScope): string {
  return [
    `r:${encodeURIComponent(scope.resourceName)}`,
    `p:${encodeURIComponent(scope.providerName)}`,
    `t:${encodeScopeValue(scope.tenantIdentity)}`,
    ...(scope.identityKey === undefined ? [] : [`u:${encodeScopeValue(scope.identityKey)}`]),
  ].join('|');
}

export function canMigrateLegacyListPreferences(scope: ListPreferenceScope): boolean {
  return scope.providerName === 'default' && scope.tenantIdentity === undefined && scope.identityKey === undefined;
}

export function savedListViewsStorageKey(scope: ListPreferenceScope): string {
  return `svadmin-list-views-v2-${listPreferenceScopeId(scope)}`;
}

export function activeSavedListViewStorageKey(scope: ListPreferenceScope): string {
  return `svadmin-list-view-active-v2-${listPreferenceScopeId(scope)}`;
}

export function columnVisibilityStorageKey(scope: ListPreferenceScope): string {
  return `svadmin-columns-v2-${listPreferenceScopeId(scope)}`;
}

export function columnOrderStorageKey(scope: ListPreferenceScope): string {
  return `svadmin-colorder-v2-${listPreferenceScopeId(scope)}`;
}

export function legacySavedListViewsStorageKey(resourceName: string): string {
  return `svadmin-list-views-${resourceName}`;
}

export function legacyActiveSavedListViewStorageKey(resourceName: string): string {
  return `svadmin-list-view-active-${resourceName}`;
}

export function legacyColumnVisibilityStorageKey(resourceName: string): string {
  return `svadmin-columns-${resourceName}`;
}

export function legacyColumnOrderStorageKey(resourceName: string): string {
  return `svadmin-colorder-${resourceName}`;
}
