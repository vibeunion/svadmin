import type { Filter, LogicalFilter, Sort } from './types';
import { isCrudFieldOperator } from './types';
import { captureAdminContext } from './context.svelte';
import type { AdminContextAccessor } from './context.svelte';
import { getAdminOptions } from './options.svelte';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFilterKey(value: Record<string, unknown>): string | undefined | null {
  if (!('key' in value)) return undefined;
  const key = value['key'];
  if (typeof key !== 'string' || key.length < 1 || key.length > 128) return null;
  return key;
}

/** 重新构造过滤器，只保留协议字段，避免把 URL 里的多余属性写回路由状态。 */
function readFilter(value: unknown, depth: number, budget: { remaining: number }): Filter | undefined {
  if (depth > 20 || budget.remaining-- <= 0 || !isRecord(value)) return undefined;

  if (typeof value['field'] === 'string') {
    if (value['field'].trim().length === 0 || !isCrudFieldOperator(value['operator']) || !('value' in value)) {
      return undefined;
    }
    return { field: value['field'], operator: value['operator'], value: value['value'] };
  }

  if ((value['operator'] !== 'and' && value['operator'] !== 'or') || !Array.isArray(value['value'])) {
    return undefined;
  }
  const key = readFilterKey(value);
  if (key === null) return undefined;
  const children: Filter[] = [];
  for (const entry of value['value']) {
    const child = readFilter(entry, depth + 1, budget);
    if (!child) return undefined;
    children.push(child);
  }
  const filter: LogicalFilter = { operator: value['operator'], value: children };
  if (key !== undefined) filter.key = key;
  return filter;
}

function parseFilters(value: string): Filter[] | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;
    const budget = { remaining: 200 };
    const filters: Filter[] = [];
    for (const entry of parsed) {
      const filter = readFilter(entry, 0, budget);
      if (!filter) return undefined;
      filters.push(filter);
    }
    return filters;
  } catch {
    return undefined;
  }
}

const MAX_SORTERS = 16;

function parseSorters(value: string): Sort[] | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > MAX_SORTERS) return undefined;
    const sorters: Sort[] = [];
    for (const entry of parsed) {
      if (!isRecord(entry) || Object.keys(entry).some((key) => key !== 'field' && key !== 'order')) return undefined;
      const field = entry['field'];
      const order = entry['order'];
      if (typeof field !== 'string' || field.trim().length === 0 || field.length > 256) return undefined;
      if (order !== 'asc' && order !== 'desc') return undefined;
      sorters.push({ field, order });
    }
    return sorters;
  } catch {
    return undefined;
  }
}

function positiveIntegerParam(value: string | undefined, max: number): string | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= max ? String(parsed) : undefined;
}

/**
 * Preserves query state that can be safely restored when navigating from a list to CRUD pages.
 * Unknown parameters do not propagate across pages, preventing detail, tenantId, or sensitive values from entering record routes.
 */
export function sanitizeListQueryParams(params: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const page = positiveIntegerParam(params['page'], 1_000_000);
  const pageSize = positiveIntegerParam(params['pageSize'], 1_000);
  const sorters = params['sorters'] ? parseSorters(params['sorters']) : undefined;
  const sort = params['sort']?.trim();
  const search = params['q'];
  const filters = params['filters'] ? parseFilters(params['filters']) : undefined;

  if (page) result['page'] = page;
  if (pageSize) result['pageSize'] = pageSize;
  if (sorters?.length) {
    const first = sorters[0];
    if (first) {
      result['sorters'] = JSON.stringify(sorters);
      result['sort'] = first.field;
      result['order'] = first.order;
    }
  } else if (sort && sort.length <= 256) {
    result['sort'] = sort;
    if (params['order'] === 'asc' || params['order'] === 'desc') result['order'] = params['order'];
  }
  if (search && search.length <= 1_000) result['q'] = search;
  if (filters) result['filters'] = JSON.stringify(filters);
  if (params['records'] === '1') result['records'] = '1';

  return result;
}

export function appendListQuery(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(sanitizeListQueryParams(params)).toString();
  if (!query) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}

export function appendListQueryFromPath(path: string, currentPath: string): string {
  const queryString = currentPath.split('?')[1];
  if (!queryString) return path;
  return appendListQuery(path, Object.fromEntries(new URLSearchParams(queryString)));
}

export interface URLState {
  page?: number;
  pageSize?: number;
  sorters?: Sort[];
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Filter[];
  detailId?: string;
}

export function readURLState(adminContext: AdminContextAccessor = captureAdminContext()): URLState {
  if (typeof window === 'undefined') return {};
  const rp = adminContext.routerProvider;
  if (!rp) return {};

  const { params } = rp.parse();
  const state: URLState = {};

  const page = params['page'];
  if (page) { const n = parseInt(page, 10); if (!isNaN(n) && n > 0) state.page = n; }

  const pageSize = params['pageSize'];
  if (pageSize) { const n = parseInt(pageSize, 10); if (!isNaN(n) && n > 0) state.pageSize = n; }

  const sorters = params['sorters'] ? parseSorters(params['sorters']) : undefined;
  if (sorters?.length) {
    const first = sorters[0];
    state.sorters = sorters;
    if (first) {
      state.sortField = first.field;
      state.sortOrder = first.order;
    }
  } else {
    const sortField = params['sort'];
    const sortOrder = params['order'];
    if (sortField) {
      state.sortField = sortField;
      const order = sortOrder === 'desc' ? 'desc' : 'asc';
      state.sorters = [{ field: sortField, order }];
    }
    if (sortOrder === 'asc' || sortOrder === 'desc') state.sortOrder = sortOrder;
  }

  const search = params['q'];
  if (search) state.search = search;

  const filtersRaw = params['filters'];
  if (filtersRaw) {
    const filters = parseFilters(filtersRaw);
    if (filters) state.filters = filters;
  }

  const detailId = params['detail'];
  if (detailId) state.detailId = detailId;

  return state;
}

export function writeURLState(
  // An own undefined field clears that URL parameter; an absent field leaves it unchanged.
  state: { [K in keyof URLState]?: URLState[K] | undefined },
  adminContext: AdminContextAccessor = captureAdminContext(),
  type: 'push' | 'replace' = 'replace',
): void {
  if (typeof window === 'undefined') return;
  const rp = adminContext.routerProvider;
  if (!rp) return;

  const current = rp.parse();
  const params: Record<string, string> = { ...current.params };

  if ('page' in state) {
    if (state.page && state.page > 1) params['page'] = String(state.page);
    else delete params['page'];
  }

  if ('pageSize' in state) {
    if (state.pageSize && state.pageSize !== (getAdminOptions().defaultPageSize ?? 10)) params['pageSize'] = String(state.pageSize);
    else delete params['pageSize'];
  }

  if ('sorters' in state) {
    const sorters = state.sorters ?? [];
    const first = sorters[0];
    if (sorters.length > 0 && first) {
      params['sorters'] = JSON.stringify(sorters);
      params['sort'] = first.field;
      params['order'] = first.order;
    } else {
      delete params['sorters'];
      delete params['sort'];
      delete params['order'];
    }
  } else {
    if ('sortField' in state) {
      if (state.sortField) params['sort'] = state.sortField;
      else delete params['sort'];
    }

    if ('sortOrder' in state) {
      if (state.sortOrder) params['order'] = state.sortOrder;
      else delete params['order'];
    }
  }

  if ('search' in state) {
    if (state.search) params['q'] = state.search;
    else delete params['q'];
  }

  if ('filters' in state) {
    if (state.filters && state.filters.length > 0) {
      params['filters'] = JSON.stringify(state.filters);
    } else {
      delete params['filters'];
    }
  }

  if ('detailId' in state) {
    if (state.detailId) params['detail'] = state.detailId;
    else delete params['detail'];
  }

  // Prevent redundant navigation if nothing actually changed
  const qsOld = new URLSearchParams(current.params).toString();
  const qsNew = new URLSearchParams(params).toString();
  
  if (qsOld !== qsNew) {
    rp.go({
      to: current.pathname,
      query: params,
      type,
    });
  }
}
