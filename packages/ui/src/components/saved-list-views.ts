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
}

export interface ListPreferenceScope {
  resourceName: string;
  providerName: string;
  tenantIdentity?: string | number;
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

  if (typeof value.field === 'string') {
    if (!allowedFieldIds.has(value.field) || typeof value.operator !== 'string' || !CRUD_OPERATORS.has(value.operator) || !('value' in value)) {
      return undefined;
    }
    return {
      field: value.field,
      operator: value.operator as CrudOperator,
      value: value.value,
    } as Filter;
  }

  if ((value.operator !== 'and' && value.operator !== 'or') || !Array.isArray(value.value)) return undefined;
  const children = value.value.map((entry) => parseFilter(entry, allowedFieldIds, budget, depth + 1));
  if (children.some((entry) => entry === undefined)) return undefined;
  return { operator: value.operator, value: children as Filter[] };
}

function parseSorters(value: unknown[], allowedFieldIds: Set<string>): Sort[] | undefined {
  const sorters: Sort[] = [];
  for (const sorter of value) {
    if (!isRecord(sorter) || typeof sorter.field !== 'string' || !allowedFieldIds.has(sorter.field)) return undefined;
    if (sorter.order !== 'asc' && sorter.order !== 'desc') return undefined;
    sorters.push({ field: sorter.field, order: sorter.order });
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
  if (typeof value.search !== 'string' || value.search.length > 1_000) return undefined;
  if (!Array.isArray(value.filters) || !Array.isArray(value.sorters)) return undefined;
  if (!isRecord(value.pagination) || !isPositiveInteger(value.pagination.current, 1_000_000) || !isPositiveInteger(value.pagination.pageSize, 1_000)) {
    return undefined;
  }

  const allowedFieldIds = new Set([...allowedColumnIds].filter((columnId) => !columnId.startsWith('_')));
  const filterBudget = { remaining: MAX_FILTER_NODES };
  const filters = value.filters.map((entry) => parseFilter(entry, allowedFieldIds, filterBudget));
  if (filters.some((entry) => entry === undefined)) return undefined;
  const sorters = parseSorters(value.sorters, allowedFieldIds);
  const columnVisibility = parseColumnVisibility(value.columnVisibility, allowedColumnIds);
  const columnOrder = parseColumnOrder(value.columnOrder, allowedColumnIds);
  if (!sorters || !columnVisibility || !columnOrder) return undefined;

  return {
    search: value.search,
    filters: filters as Filter[],
    sorters,
    pagination: {
      current: value.pagination.current,
      pageSize: value.pagination.pageSize,
    },
    columnVisibility,
    columnOrder,
  };
}

export function readSavedListViews(raw: string | null, allowedColumnIds: Set<string>): SavedListView[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.views)) return [];

    const views: SavedListView[] = [];
    const seenIds = new Set<string>();
    for (const entry of parsed.views.slice(0, MAX_SAVED_VIEWS)) {
      if (!isRecord(entry) || typeof entry.id !== 'string' || !entry.id.trim() || entry.id.length > 120) continue;
      if (seenIds.has(entry.id)) continue;
      if (typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 60) continue;
      const state = parseState(entry.state, allowedColumnIds);
      if (!state) continue;
      seenIds.add(entry.id);
      views.push({ id: entry.id, name: entry.name.trim(), state });
    }
    return views;
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
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
  ].join('|');
}

export function canMigrateLegacyListPreferences(scope: ListPreferenceScope): boolean {
  return scope.providerName === 'default' && scope.tenantIdentity === undefined;
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
