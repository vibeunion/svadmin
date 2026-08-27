import type { Filter } from './types';
import { captureAdminContext } from './context.svelte';
import type { AdminContextAccessor } from './context.svelte';
import { getAdminOptions } from './options.svelte';

const CRUD_OPERATORS = new Set([
  'eq', 'ne', 'lt', 'gt', 'lte', 'gte',
  'contains', 'ncontains', 'startswith', 'endswith',
  'in', 'nin', 'null', 'nnull', 'between', 'nbetween',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFilter(value: unknown, depth: number, budget: { remaining: number }): value is Filter {
  if (depth > 20 || budget.remaining-- <= 0 || !isRecord(value)) return false;

  if (typeof value.field === 'string') {
    return value.field.trim().length > 0
      && typeof value.operator === 'string'
      && CRUD_OPERATORS.has(value.operator)
      && 'value' in value;
  }

  return (value.operator === 'and' || value.operator === 'or')
    && Array.isArray(value.value)
    && value.value.every((entry) => isFilter(entry, depth + 1, budget));
}

function parseFilters(value: string): Filter[] | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;
    const budget = { remaining: 200 };
    return parsed.every((entry) => isFilter(entry, 0, budget)) ? parsed : undefined;
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
 * 保留从列表进入 CRUD 页面时可安全恢复的查询状态。
 * 未知参数不会跨页面传播，避免把 detail、tenantId 或敏感参数带入记录路由。
 */
export function sanitizeListQueryParams(params: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const page = positiveIntegerParam(params['page'], 1_000_000);
  const pageSize = positiveIntegerParam(params['pageSize'], 1_000);
  const sort = params['sort']?.trim();
  const search = params['q'];
  const filters = params['filters'] ? parseFilters(params['filters']) : undefined;

  if (page) result['page'] = page;
  if (pageSize) result['pageSize'] = pageSize;
  if (sort && sort.length <= 256) {
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

  const sortField = params['sort'];
  if (sortField) state.sortField = sortField;

  const sortOrder = params['order'];
  if (sortOrder === 'asc' || sortOrder === 'desc') state.sortOrder = sortOrder;

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
  state: URLState,
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

  if ('sortField' in state) {
    if (state.sortField) params['sort'] = state.sortField;
    else delete params['sort'];
  }

  if ('sortOrder' in state) {
    if (state.sortOrder) params['order'] = state.sortOrder;
    else delete params['order'];
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
