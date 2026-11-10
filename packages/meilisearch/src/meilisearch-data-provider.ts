import type {
  DataProvider,
  GetListParams,
  GetListResult,
  GetOneParams,
  GetOneResult,
  CreateParams,
  CreateResult,
  UpdateParams,
  UpdateResult,
  DeleteParams,
  DeleteResult,
  CustomParams,
  CustomResult,
  BaseRecord,
  Filter,
} from '@svadmin/core';

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface MeilisearchOptions {
  /** Base URL of the Meilisearch instance, e.g. 'http://localhost:7700' */
  host: string;
  /** Master or search API key */
  apiKey?: string | undefined;
  /** Custom request headers */
  headers?: Record<string, string> | undefined;
  /** Optional map translating svadmin resources to Meilisearch index UIDs */
  indexMap?: Record<string, string> | undefined;
  /** Document primary key field (default: 'id') */
  primaryKey?: string | undefined;
  /** Whether to automatically request and unpack highlighted snippets (default: true) */
  highlight?: boolean | undefined;
  /** Custom fetch implementation (useful for tests or runtime hooks) */
  fetch?: FetchLike | undefined;
}

function escapeFilterValue(val: unknown): string {
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (val === null || val === undefined) {
    return 'null';
  }
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function buildMeilisearchFilter(filters?: Filter[]): { filterString: string; searchQuery: string } {
  if (!filters || filters.length === 0) {
    return { filterString: '', searchQuery: '' };
  }

  const expressions: string[] = [];
  let extractedQuery = '';

  for (const f of filters) {
    if ('field' in f) {
      const field = f.field;
      const op = f.operator;
      const val = f.value;

      // 如果 filter 用于全文检索关键词
      if (field === 'q' || field === 'search' || field === '_q' || field === 'query') {
        if (typeof val === 'string' && val.trim()) {
          extractedQuery = val.trim();
        }
        continue;
      }

      switch (op) {
        case 'eq':
          expressions.push(`${field} = ${escapeFilterValue(val)}`);
          break;
        case 'ne':
          expressions.push(`${field} != ${escapeFilterValue(val)}`);
          break;
        case 'lt':
          expressions.push(`${field} < ${escapeFilterValue(val)}`);
          break;
        case 'lte':
          expressions.push(`${field} <= ${escapeFilterValue(val)}`);
          break;
        case 'gt':
          expressions.push(`${field} > ${escapeFilterValue(val)}`);
          break;
        case 'gte':
          expressions.push(`${field} >= ${escapeFilterValue(val)}`);
          break;
        case 'in': {
          const arr = Array.isArray(val) ? val : [val];
          const formatted = arr.map((item) => escapeFilterValue(item)).join(', ');
          expressions.push(`${field} IN [${formatted}]`);
          break;
        }
        case 'null':
          expressions.push(`${field} IS NULL`);
          break;
        case 'nnull':
          expressions.push(`${field} IS NOT NULL`);
          break;
        case 'contains':
          // Meilisearch 属性级别等于或搜索
          expressions.push(`${field} = ${escapeFilterValue(val)}`);
          break;
        default:
          expressions.push(`${field} = ${escapeFilterValue(val)}`);
      }
    } else if ('operator' in f && 'value' in f && Array.isArray(f.value)) {
      const subResults = f.value.map((child) => buildMeilisearchFilter([child]));
      const validSubStrings = subResults
        .map((r) => r.filterString)
        .filter((s) => s.length > 0);

      for (const r of subResults) {
        if (r.searchQuery && !extractedQuery) {
          extractedQuery = r.searchQuery;
        }
      }

      if (validSubStrings.length > 0) {
        const joiner = f.operator.toUpperCase() === 'OR' ? ' OR ' : ' AND ';
        expressions.push(`(${validSubStrings.join(joiner)})`);
      }
    }
  }

  return {
    filterString: expressions.join(' AND '),
    searchQuery: extractedQuery,
  };
}

export function createMeilisearchDataProvider(options: MeilisearchOptions): DataProvider {
  const host = options.host.replace(/\/+$/, '');
  const fetchFn = options.fetch ?? globalThis.fetch;
  const primaryKey = options.primaryKey ?? 'id';
  const shouldHighlight = options.highlight ?? true;

  function resolveIndex(resource: string): string {
    return options.indexMap?.[resource] ?? resource;
  }

  function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (options.apiKey) {
      headers['Authorization'] = `Bearer ${options.apiKey}`;
    }
    return headers;
  }

  async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = `${host}${endpoint}`;
    const res = await fetchFn(url, {
      ...init,
      headers: {
        ...getHeaders(),
        ...init?.headers,
      },
    });

    if (!res.ok) {
      let errorMsg = `Meilisearch request failed (${res.status} ${res.statusText})`;
      try {
        const json = await res.json() as Record<string, unknown>;
        if (json && typeof json['message'] === 'string') {
          errorMsg = `${errorMsg}: ${json['message']}`;
        }
      } catch {
        // ignore parsing error
      }
      throw new Error(errorMsg);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  }

  return {
    getList: async <TData extends BaseRecord = BaseRecord>(
      params: GetListParams,
    ): Promise<GetListResult<TData>> => {
      const { resource, pagination, sorters, filters, meta } = params;
      const indexUid = resolveIndex(resource);

      const page = pagination?.current ?? 1;
      const pageSize = pagination?.pageSize ?? 10;
      const offset = (page - 1) * pageSize;

      const { filterString, searchQuery } = buildMeilisearchFilter(filters);
      const q = typeof meta?.['q'] === 'string'
        ? (meta['q'] as string)
        : typeof meta?.['search'] === 'string'
          ? (meta['search'] as string)
          : searchQuery;

      const body: Record<string, unknown> = {
        q: q || '',
        offset,
        limit: pageSize,
      };

      if (filterString) {
        body['filter'] = filterString;
      }

      if (sorters && sorters.length > 0) {
        body['sort'] = sorters.map((s) => `${s.field}:${s.order === 'asc' ? 'asc' : 'desc'}`);
      }

      if (shouldHighlight) {
        body['attributesToHighlight'] = ['*'];
      }

      if (meta?.['facets'] && Array.isArray(meta['facets'])) {
        body['facets'] = meta['facets'];
      }

      interface SearchResponse {
        hits: Array<Record<string, unknown> & { _formatted?: Record<string, unknown> }>;
        offset: number;
        limit: number;
        estimatedTotalHits?: number;
        totalHits?: number;
        facetDistribution?: Record<string, Record<string, number>>;
      }

      const res = await request<SearchResponse>(`/indexes/${indexUid}/search`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const total = res.totalHits ?? res.estimatedTotalHits ?? res.hits.length;

      const data = res.hits.map((hit) => {
        const item = { ...hit };
        if (primaryKey !== 'id' && item[primaryKey] !== undefined && item['id'] === undefined) {
          item['id'] = item[primaryKey];
        }
        return item as unknown as TData;
      });

      return {
        data,
        total,
      };
    },

    getOne: async <TData extends BaseRecord = BaseRecord>(
      params: GetOneParams,
    ): Promise<GetOneResult<TData>> => {
      const { resource, id } = params;
      const indexUid = resolveIndex(resource);
      const doc = await request<Record<string, unknown>>(`/indexes/${indexUid}/documents/${id}`);
      const item = { ...doc };
      if (primaryKey !== 'id' && item[primaryKey] !== undefined && item['id'] === undefined) {
        item['id'] = item[primaryKey];
      }
      return {
        data: item as unknown as TData,
      };
    },

    create: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: CreateParams<TVariables>,
    ): Promise<CreateResult<TData>> => {
      const { resource, variables } = params;
      const indexUid = resolveIndex(resource);
      await request(`/indexes/${indexUid}/documents`, {
        method: 'POST',
        body: JSON.stringify([variables]),
      });
      return {
        data: variables as unknown as TData,
      };
    },

    update: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: UpdateParams<TVariables>,
    ): Promise<UpdateResult<TData>> => {
      const { resource, id, variables } = params;
      const indexUid = resolveIndex(resource);
      const payload = {
        ...variables,
        [primaryKey]: id,
      };
      await request(`/indexes/${indexUid}/documents`, {
        method: 'PUT',
        body: JSON.stringify([payload]),
      });
      return {
        data: payload as unknown as TData,
      };
    },

    deleteOne: async <TData extends BaseRecord = BaseRecord>(
      params: DeleteParams,
    ): Promise<DeleteResult<TData>> => {
      const { resource, id } = params;
      const indexUid = resolveIndex(resource);
      await request(`/indexes/${indexUid}/documents/${id}`, {
        method: 'DELETE',
      });
      return {
        data: { [primaryKey]: id } as unknown as TData,
      };
    },

    custom: async <TData = unknown>(params: CustomParams): Promise<CustomResult<TData>> => {
      const { url, method = 'get', headers, payload } = params;
      const data = await request<TData>(url.startsWith('/') ? url : `/${url}`, {
        method: method.toUpperCase(),
        ...(headers && { headers }),
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      return { data };
    },

    getApiUrl: () => host,
  };
}
