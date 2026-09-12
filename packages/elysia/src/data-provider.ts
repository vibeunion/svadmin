import { definedOptions } from '@svadmin/core/options';
// Elysia DataProvider — CRUD convention compatible
// Expects backend routes following: GET /resource, GET /resource/:id, POST /resource, PATCH /resource/:id, DELETE /resource/:id
// Response format for lists: { items: T[], total: number } (also supports raw arrays)

import type {
  DataProvider, FieldFilter, Filter, Sort, Pagination,
} from '@svadmin/core';
import { withValidatedResponses, type DataTransport } from '@svadmin/core/schema';

export interface ElysiaResourceContext {
  apiUrl: string;
  resource: string;
  meta?: Record<string, unknown>;
}

export interface ElysiaListContext extends ElysiaResourceContext {
  pagination: {
    current: number;
    pageSize: number;
    mode?: Pagination['mode'];
  };
  sorters: Sort[];
  filters: Filter[];
}

export type ElysiaResourceMatcher = string | RegExp | ((resource: string) => boolean);

/** Per-resource transport overrides for APIs with mixed URL/query/envelope dialects. */
export interface ElysiaResourceAdapter {
  match: ElysiaResourceMatcher;
  /**
   * Path appended to `apiUrl`. Encode dynamic path segments inside the resolver;
   * the provider intentionally does not encode the complete resource path.
   */
  resourcePath?: string | ((context: ElysiaResourceContext) => string);
  /** Build the complete query string for list requests. */
  buildListSearchParams?: (context: ElysiaListContext) => URLSearchParams;
  /** Normalize a resource-specific list envelope while retaining extra result metadata. */
  parseListResponse?: (
    json: unknown,
    context: ElysiaListContext,
  ) => unknown;
}

export interface ElysiaDataProviderOptions {
  /** Base API URL, e.g. 'http://localhost:3000' */
  apiUrl: string;
  /** Static headers or a function returning headers (useful for auth tokens) */
  headers?: Record<string, string> | (() => Record<string, string>);
  /**
   * HTTP method to use for update operations.
   * @default 'PATCH'
   */
  updateMethod?: 'PATCH' | 'PUT';
  /**
   * Whether to include credentials (cookies) in requests.
   * Set to `true` for cookie-based authentication.
   * @default false
   */
  withCredentials?: boolean;
  /**
   * Custom resource-to-URL segment mapping.
   * Maps a resource name to a URL segment, e.g. `{ user_groups: 'user-groups' }`.
   * When not provided, the resource name is used as-is.
   */
  resourceUrlMap?: Record<string, string>;
  /**
   * Custom response parser for list endpoints.
   * When provided, this function extracts `{ data, total }` from the raw JSON response.
   * Use the `resource` parameter to apply different parsers per resource.
   * Useful when the backend response format differs from `{ items, total }`.
   *
   * @default Handles `{ items, total }` and raw arrays automatically
   */
  parseListResponse?: (
    json: unknown,
    resource: string,
  ) => unknown;
  /**
   * Ordered per-resource transport overrides. The first matching adapter wins.
   * Existing global options remain the fallback for unmatched resources.
   */
  resourceAdapters?: readonly ElysiaResourceAdapter[];
}

const DEFAULT_JSON_HEADERS: Record<string, string> = { 'Content-Type': 'application/json' };

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

function mergeHeaders(...sources: Array<Record<string, string> | undefined>): Record<string, string> {
  const merged = new Map<string, readonly [name: string, value: string]>();

  for (const source of sources) {
    if (!source) continue;
    for (const [name, value] of Object.entries(source)) {
      merged.set(name.toLowerCase(), [name, value]);
    }
  }

  return Object.fromEntries(merged.values());
}

function resolveHeaders(opts: ElysiaDataProviderOptions): Record<string, string> {
  const extra = typeof opts.headers === 'function' ? opts.headers() : (opts.headers ?? {});
  return mergeHeaders(DEFAULT_JSON_HEADERS, extra);
}

function matchesResource(matcher: ElysiaResourceMatcher, resource: string): boolean {
  if (typeof matcher === 'string') return matcher === resource;
  if (typeof matcher === 'function') return matcher(resource);
  matcher.lastIndex = 0;
  return matcher.test(resource);
}

function resolveResourceAdapter(
  opts: ElysiaDataProviderOptions,
  resource: string,
): ElysiaResourceAdapter | undefined {
  return opts.resourceAdapters?.find(adapter => matchesResource(adapter.match, resource));
}

function resolveResourceUrlWithAdapter(
  opts: ElysiaDataProviderOptions,
  context: ElysiaResourceContext,
  adapter: ElysiaResourceAdapter | undefined,
): string {
  const configuredPath = typeof adapter?.resourcePath === 'function'
    ? adapter.resourcePath(context)
    : adapter?.resourcePath;
  const path = configuredPath ?? opts.resourceUrlMap?.[context.resource] ?? context.resource;
  return `${opts.apiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function resolveResourceUrl(
  opts: ElysiaDataProviderOptions,
  resource: string,
  meta?: Record<string, unknown>,
): string {
  const context: ElysiaResourceContext = definedOptions({ apiUrl: opts.apiUrl, resource, meta });
  return resolveResourceUrlWithAdapter(opts, context, resolveResourceAdapter(opts, resource));
}

function encodeIdPathSegment(id: string | number): string {
  return encodeURIComponent(String(id));
}

function isSameOrigin(apiUrl: string, targetUrl: string): boolean {
  try {
    const api = new URL(apiUrl);
    const target = new URL(targetUrl, apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
    return api.origin === target.origin;
  } catch {
    return false;
  }
}

function serializeQueryValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  const serialized = JSON.stringify(value);
  return serialized === undefined ? String(value) : serialized;
}

function appendQuery(params: URLSearchParams, query?: Record<string, unknown>): void {
  if (!query) return;

  for (const [name, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(name, serializeQueryValue(item));
      continue;
    }
    params.set(name, serializeQueryValue(value));
  }
}

function appendSorters(params: URLSearchParams, sorters?: Sort[]): void {
  if (!sorters?.length) return;
  params.set('_sort', sorters.map(sorter => sorter.field).join(','));
  params.set('_order', sorters.map(sorter => sorter.order).join(','));
}

function filterParamName(filter: FieldFilter): string {
  if (filter.operator === 'eq') return filter.field;
  if (filter.operator === 'contains') return `${filter.field}_like`;
  return `${filter.field}_${filter.operator}`;
}

function filterParamValue(filter: FieldFilter): string {
  if (filter.operator === 'null' || filter.operator === 'nnull') return 'true';
  if (Array.isArray(filter.value)) {
    return filter.value.map(serializeQueryValue).join(',');
  }
  return serializeQueryValue(filter.value);
}

function appendFilters(params: URLSearchParams, filters?: Filter[]): void {
  if (!filters?.length) return;

  let hasLogicalFilter = false;
  for (const filter of filters) {
    if ('field' in filter) {
      params.append(filterParamName(filter), filterParamValue(filter));
    } else {
      hasLogicalFilter = true;
    }
  }

  // Flat filters keep the established field_operator convention. A canonical
  // JSON copy is added only when a logical group is present, because OR/AND
  // cannot be represented without losing nesting in flat query parameters.
  if (hasLogicalFilter) params.set('_filters', JSON.stringify(filters));
}

function buildDefaultListSearchParams(context: ElysiaListContext): URLSearchParams {
  const params = new URLSearchParams();
  params.set('_page', String(context.pagination.current));
  params.set('_limit', String(context.pagination.pageSize));
  appendSorters(params, context.sorters);
  appendFilters(params, context.filters);
  return params;
}

function buildCustomUrl(
  url: string,
  apiUrl: string,
  query?: Record<string, unknown>,
  sorters?: Sort[],
  filters?: Filter[],
): string {
  const parsed = new URL(url, apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
  appendQuery(parsed.searchParams, query);
  appendSorters(parsed.searchParams, sorters);
  appendFilters(parsed.searchParams, filters);
  return parsed.toString();
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const contentLength = response.headers?.get('content-length');
  if (contentLength?.trim() === '0') {
    return undefined;
  }

  const body = await response.text();
  if (!body || body.trim() === '') {
    return undefined;
  }

  return JSON.parse(body);
}

async function request(url: string, headers: Record<string, string>, init?: RequestOptions, withCredentials?: boolean): Promise<unknown> {
  init?.signal?.throwIfAborted();
  const fetchInit: RequestInit = { ...init, headers: mergeHeaders(headers, init?.headers) };
  if (withCredentials) {
    fetchInit.credentials = 'include';
  }
  const response = await fetch(url, fetchInit);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${response.statusText}${body ? ` — ${body}` : ''}`);
  }
  return parseResponse(response);
}

/**
 * Default list response parser.
 * Supports:
 * - `{ items: T[], total: number }` (standard)
 * - `{ data: T[], total: number }` (common alternative)
 * - `T[]` (raw array — total is inferred from array length)
 */
function normalizeObjectListResponse(
  response: Record<string, unknown>,
  recordsKey: 'items' | 'data',
): unknown {
  const { [recordsKey]: rawRecords, ...metadata } = response;
  return {
    ...metadata,
    data: rawRecords,
    total: response['total'] !== undefined ? response['total'] : Array.isArray(rawRecords) ? rawRecords.length : undefined,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function defaultParseListResponse(json: unknown): unknown {
  if (Array.isArray(json)) {
    return { data: json, total: json.length };
  }
  if (isObject(json) && Array.isArray(json['items'])) {
    return normalizeObjectListResponse(json, 'items');
  }
  if (isObject(json) && Array.isArray(json['data'])) {
    return normalizeObjectListResponse(json, 'data');
  }
  // Keep malformed payloads unknown so the shared boundary rejects them.
  return json;
}

/**
 * Creates a DataProvider for Elysia backends using the CRUD plugin convention.
 *
 * List responses support multiple formats:
 * - `{ items: T[], total: number }` (standard CRUD convention)
 * - `{ data: T[], total: number }` (common alternative)
 * - `T[]` (raw array — total is inferred from length)
 *
 * @example
 * ```ts
 * const dataProvider = createElysiaDataProvider({
 *   apiUrl: 'http://localhost:3000/api',
 *   withCredentials: true,  // cookie auth
 *   updateMethod: 'PUT',    // use PUT instead of PATCH
 *   resourceUrlMap: {
 *     user_groups: 'user-groups',
 *   },
 * });
 * ```
 */
export function createElysiaDataProvider(opts: ElysiaDataProviderOptions): DataProvider {
  const { apiUrl, updateMethod = 'PATCH', withCredentials = false } = opts;

  const transport: DataTransport = {
    getApiUrl: () => apiUrl,

    async getList({ resource, pagination, sorters, filters, meta, signal }) {
      const { current = 1, pageSize = 10 } = pagination ?? {};
      const context: ElysiaListContext = definedOptions({
        apiUrl,
        resource,
        meta,
        pagination: { current, pageSize, mode: pagination?.mode },
        sorters: sorters ?? [],
        filters: filters ?? [],
      });
      const adapter = resolveResourceAdapter(opts, resource);
      const params = adapter?.buildListSearchParams?.(context) ?? buildDefaultListSearchParams(context);
      const baseUrl = resolveResourceUrlWithAdapter(opts, context, adapter);
      const query = params.toString();
      const url = query ? `${baseUrl}?${query}` : baseUrl;
      const headers = resolveHeaders(opts);
      const json = await request(url, headers, definedOptions({ signal }), withCredentials);
      if (adapter?.parseListResponse) {
        return adapter.parseListResponse(json, context);
      }
      if (opts.parseListResponse) {
        return opts.parseListResponse(json, resource);
      }
      return defaultParseListResponse(json);
    },

    async getOne({ resource, id, meta, signal }) {
      const baseUrl = resolveResourceUrl(opts, resource, meta);
      const data = await request(`${baseUrl}/${encodeIdPathSegment(id)}`, resolveHeaders(opts), definedOptions({ signal }), withCredentials);      return { data };
    },

    async create({ resource, variables, meta }) {
      const baseUrl = resolveResourceUrl(opts, resource, meta);
      const data = await request(baseUrl, resolveHeaders(opts), {
        method: 'POST',
        body: JSON.stringify(variables),
      }, withCredentials);
      return { data };
    },

    async update({ resource, id, variables, meta }) {
      const baseUrl = resolveResourceUrl(opts, resource, meta);
      const data = await request(`${baseUrl}/${encodeIdPathSegment(id)}`, resolveHeaders(opts), {
        method: updateMethod,
        body: JSON.stringify(variables),
      }, withCredentials);
      return { data };
    },

    async deleteOne({ resource, id, meta }) {
      const baseUrl = resolveResourceUrl(opts, resource, meta);
      const data = await request(`${baseUrl}/${encodeIdPathSegment(id)}`, resolveHeaders(opts), {
        method: 'DELETE',
      }, withCredentials);
      return { data: data === undefined ? { id } : data };
    },

    async getMany({ resource, ids, meta, signal }) {
      const baseUrl = resolveResourceUrl(opts, resource, meta);
      const params = ids.map(id => `id=${encodeURIComponent(String(id))}`).join('&');
      const data = await request(`${baseUrl}?${params}`, resolveHeaders(opts), definedOptions({ signal }), withCredentials);      return { data };
    },

    async createMany({ resource, variables, meta }) {
      const baseUrl = resolveResourceUrl(opts, resource, meta);
      const results = await Promise.all(
        variables.map(vars =>
          request(baseUrl, resolveHeaders(opts), {
            method: 'POST',
            body: JSON.stringify(vars),
          }, withCredentials)
        )
      );
      return { data: results };
    },

    async updateMany({ resource, ids, variables, meta }) {
      const baseUrl = resolveResourceUrl(opts, resource, meta);
      const results = await Promise.all(
        ids.map(id =>
          request(`${baseUrl}/${encodeIdPathSegment(id)}`, resolveHeaders(opts), {
            method: updateMethod,
            body: JSON.stringify(variables),
          }, withCredentials)
        )
      );
      return { data: results };
    },

    async deleteMany({ resource, ids, meta }) {
      const baseUrl = resolveResourceUrl(opts, resource, meta);
      const results = await Promise.all(
        ids.map(id =>
          request(`${baseUrl}/${encodeIdPathSegment(id)}`, resolveHeaders(opts), {
            method: 'DELETE',
          }, withCredentials).then(data => data === undefined ? { id } : data)
        )
      );
      return { data: results };
    },

    async custom({ url, method, payload, query, headers, sorters, filters, signal }) {
      const requestUrl = buildCustomUrl(url, apiUrl, query, sorters, filters);
      const sameOrigin = isSameOrigin(apiUrl, requestUrl);
      const providerHeaders = resolveHeaders(opts);
      const requestHeaders = mergeHeaders(
        // Provider-level headers often contain credentials under application-specific
        // names. Never inherit them across origins; callers must opt in explicitly via
        // custom.headers for the target service.
        sameOrigin ? providerHeaders : DEFAULT_JSON_HEADERS,
        headers,
      );
      const data = await request(requestUrl, requestHeaders, definedOptions({
        method: method.toUpperCase(),
        body: payload === undefined ? undefined : JSON.stringify(payload),
        signal,
      }), withCredentials && sameOrigin);
      return { data };
    },
  };
  return withValidatedResponses(transport);
}
