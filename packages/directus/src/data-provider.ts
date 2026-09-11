import { definedOptions } from '@svadmin/core/options';
import { withValidatedResponses, type DataTransport } from '@svadmin/core/schema';
import type {
  CrudOperator,
  DataProvider,
  FieldFilter,
  Filter,
  Sort,
} from '@svadmin/core';

const DIRECTUS_OPERATOR_MAP: Record<CrudOperator, string> = {
  eq: '_eq',
  ne: '_neq',
  lt: '_lt',
  gt: '_gt',
  lte: '_lte',
  gte: '_gte',
  contains: '_contains',
  ncontains: '_ncontains',
  startswith: '_starts_with',
  endswith: '_ends_with',
  in: '_in',
  nin: '_nin',
  null: '_null',
  nnull: '_nnull',
  between: '_between',
  nbetween: '_nbetween',
};

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'cookie2',
  'proxy-authorization',
  'x-api-key',
  'api-key',
  'x-auth-token',
  'x-access-token',
  'x-csrf-token',
  'x-xsrf-token',
]);

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

function withoutSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !SENSITIVE_HEADER_NAMES.has(name.toLowerCase())),
  );
}

function directusValue(filter: FieldFilter): unknown {
  if (filter.operator === 'null' || filter.operator === 'nnull') return true;
  return filter.value;
}

function buildDirectusRule(filter: Filter): Record<string, unknown> {
  if ('field' in filter) {
    if (!Object.prototype.hasOwnProperty.call(DIRECTUS_OPERATOR_MAP, filter.operator)) {
      throw new Error(`Unsupported Directus filter operator: ${String(filter.operator)}`);
    }
    const operator = DIRECTUS_OPERATOR_MAP[filter.operator];
    return { [filter.field]: { [operator]: directusValue(filter) } };
  }

  if (filter.operator !== 'and' && filter.operator !== 'or') {
    throw new Error(`Unsupported Directus logical operator: ${String(filter.operator)}`);
  }

  const operator = filter.operator === 'and' ? '_and' : '_or';
  return { [operator]: filter.value.map(buildDirectusRule) };
}

function buildDirectusFilter(filters?: Filter[]): Record<string, unknown> {
  if (!filters?.length) return {};
  const rules = filters.map(buildDirectusRule);
  const firstRule = rules[0];
  return rules.length === 1 && firstRule ? firstRule : { _and: rules };
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
  params.set(
    'sort',
    sorters.map(sorter => `${sorter.order === 'desc' ? '-' : ''}${sorter.field}`).join(','),
  );
}

function appendFilters(params: URLSearchParams, filters?: Filter[]): void {
  const filter = buildDirectusFilter(filters);
  if (Object.keys(filter).length) params.set('filter', JSON.stringify(filter));
}

function fieldsFromMeta(meta?: Record<string, unknown>): string[] | undefined {
  const fields = meta?.['fields'];
  if (!Array.isArray(fields) || !fields.every(field => typeof field === 'string')) return undefined;
  return fields;
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

async function fetchData(
  url: string,
  headers: Record<string, string>,
  init: RequestOptions | undefined,
  errorMessage: (status: number) => string,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: mergeHeaders(headers, init?.headers),
  });
  if (!response.ok) throw new Error(errorMessage(response.status));
  return parseResponse(response);
}

export function createDirectusDataProvider(apiUrl: string, token?: string): DataProvider {
  const providerHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) providerHeaders['Authorization'] = `Bearer ${token}`;
  const baseUrl = apiUrl.replace(/\/+$/, '');

  function request(path: string, init?: RequestOptions): Promise<unknown> {
    return fetchData(
      `${baseUrl}${path}`,
      providerHeaders,
      init,
      status => `Directus error: ${status}`,
    );
  }

  const transport: DataTransport = {
    getApiUrl: () => apiUrl,

    async getList({ resource, pagination, sorters, filters, meta }) {
      const { current = 1, pageSize = 10 } = pagination ?? {};
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('offset', String((current - 1) * pageSize));
      params.set('meta', 'total_count');
      const fields = fieldsFromMeta(meta);
      if (fields) params.set('fields', fields.join(','));
      appendSorters(params, sorters);
      appendFilters(params, filters);

      const response = await request(`/items/${resource}?${params}`);
      if (!isObject(response)) return response;
      const metadata = response['meta'];
      return {
        data: response['data'],
        total: isObject(metadata) ? metadata['total_count'] : undefined,
      };
    },

    async getOne({ resource, id, meta }) {
      const params = new URLSearchParams();
      const fields = fieldsFromMeta(meta);
      if (fields) params.set('fields', fields.join(','));
      const query = params.size ? `?${params}` : '';
      return request(
        `/items/${resource}/${encodeURIComponent(String(id))}${query}`,
      );
    },

    async create({ resource, variables }) {
      return request(`/items/${resource}`, {
        method: 'POST',
        body: JSON.stringify(variables),
      });
    },

    async update({ resource, id, variables }) {
      return request(
        `/items/${resource}/${encodeURIComponent(String(id))}`,
        { method: 'PATCH', body: JSON.stringify(variables) },
      );
    },

    async deleteOne({ resource, id }) {
      const response = await request(`/items/${resource}/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
      return response === undefined ? { data: { id } } : response;
    },

    async getMany({ resource, ids, meta }) {
      const params = new URLSearchParams();
      params.set('filter', JSON.stringify({ id: { _in: ids } }));
      const fields = fieldsFromMeta(meta);
      if (fields) params.set('fields', fields.join(','));
      return request(`/items/${resource}?${params}`);
    },

    async custom({
      url,
      method,
      payload,
      query,
      headers,
      sorters,
      filters,
    }) {
      const parsed = new URL(url, apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
      appendQuery(parsed.searchParams, query);
      appendSorters(parsed.searchParams, sorters);
      appendFilters(parsed.searchParams, filters);
      const requestUrl = parsed.toString();
      const sameOrigin = isSameOrigin(apiUrl, requestUrl);
      const requestHeaders = mergeHeaders(
        sameOrigin ? providerHeaders : withoutSensitiveHeaders(providerHeaders),
        headers,
      );
      const data = await fetchData(
        requestUrl,
        requestHeaders,
        definedOptions({
          method: method.toUpperCase(),
          body: payload === undefined ? undefined : JSON.stringify(payload),
        }),
        status => `Custom request failed: ${status}`,
      );
      return { data };
    },
  };
  return withValidatedResponses(transport);
}
