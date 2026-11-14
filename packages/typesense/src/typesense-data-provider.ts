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

export interface TypesenseOptions {
  /** Base URL of the Typesense server, e.g. 'http://localhost:8108' */
  host: string;
  /** Typesense API Key (read/write or search-only) */
  apiKey: string;
  /** Custom request headers */
  headers?: Record<string, string> | undefined;
  /** Optional mapping translating svadmin resource names to Typesense collection names */
  collectionMap?: Record<string, string> | undefined;
  /** Document primary key field (default: 'id') */
  primaryKey?: string | undefined;
  /** Default fields to search against when q is provided. Can be a string, array, or per-resource map */
  queryBy?: string | string[] | Record<string, string | string[]> | undefined;
  /** Whether to enable highlights in search results (default: true) */
  highlight?: boolean | undefined;
  /** Additional global search parameters forwarded to Typesense search API */
  additionalSearchParams?: Record<string, string | number | boolean> | undefined;
  /** Custom fetch implementation (useful for testing or proxying) */
  fetch?: FetchLike | undefined;
}

function escapeFilterValue(val: unknown): string {
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (val === null || val === undefined) {
    return 'null';
  }
  const str = String(val);
  // Typesense uses := `value` or single quotes/backticks for escaping strings with spaces or commas
  return `\`${str.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``;
}

export function buildTypesenseFilter(filters?: Filter[]): { filterString: string; searchQuery: string } {
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

      // Check if filter is specifying a fulltext search keyword
      if (field === 'q' || field === 'search' || field === '_q' || field === 'query') {
        if (typeof val === 'string' && val.trim()) {
          extractedQuery = val.trim();
        }
        continue;
      }

      switch (op) {
        case 'eq':
          expressions.push(`${field}:=${escapeFilterValue(val)}`);
          break;
        case 'ne':
          expressions.push(`${field}:!=${escapeFilterValue(val)}`);
          break;
        case 'lt':
          expressions.push(`${field}:<${typeof val === 'number' ? val : escapeFilterValue(val)}`);
          break;
        case 'lte':
          expressions.push(`${field}:<=${typeof val === 'number' ? val : escapeFilterValue(val)}`);
          break;
        case 'gt':
          expressions.push(`${field}:>${typeof val === 'number' ? val : escapeFilterValue(val)}`);
          break;
        case 'gte':
          expressions.push(`${field}:>=${typeof val === 'number' ? val : escapeFilterValue(val)}`);
          break;
        case 'in': {
          const arr = Array.isArray(val) ? val : [val];
          const formatted = arr.map((item) => escapeFilterValue(item)).join(', ');
          expressions.push(`${field}:=[${formatted}]`);
          break;
        }
        case 'nin': {
          const arr = Array.isArray(val) ? val : [val];
          const formatted = arr.map((item) => escapeFilterValue(item)).join(', ');
          expressions.push(`${field}:!=[${formatted}]`);
          break;
        }
        case 'null':
          expressions.push(`${field}:IS_NULL`);
          break;
        case 'nnull':
          expressions.push(`${field}:!IS_NULL`);
          break;
        case 'contains':
          expressions.push(`${field}:=${escapeFilterValue(val)}`);
          break;
        default:
          expressions.push(`${field}:=${escapeFilterValue(val)}`);
      }
    } else if ('operator' in f && 'value' in f && Array.isArray(f.value)) {
      const subResults = f.value.map((child) => buildTypesenseFilter([child]));
      const validSubStrings = subResults
        .map((r) => r.filterString)
        .filter((s) => s.length > 0);

      for (const r of subResults) {
        if (r.searchQuery && !extractedQuery) {
          extractedQuery = r.searchQuery;
        }
      }

      if (validSubStrings.length > 0) {
        const joiner = f.operator.toUpperCase() === 'OR' ? ' || ' : ' && ';
        expressions.push(`(${validSubStrings.join(joiner)})`);
      }
    }
  }

  return {
    filterString: expressions.join(' && '),
    searchQuery: extractedQuery,
  };
}

export function createTypesenseDataProvider(options: TypesenseOptions): DataProvider {
  const host = options.host.replace(/\/+$/, '');
  const fetchFn = options.fetch ?? globalThis.fetch;
  const primaryKey = options.primaryKey ?? 'id';
  const shouldHighlight = options.highlight ?? true;

  function resolveCollection(resource: string): string {
    return options.collectionMap?.[resource] ?? resource;
  }

  function resolveQueryBy(resource: string, metaQueryBy?: unknown): string {
    if (typeof metaQueryBy === 'string' && metaQueryBy.trim()) {
      return metaQueryBy.trim();
    }
    if (Array.isArray(metaQueryBy) && metaQueryBy.length > 0) {
      return metaQueryBy.join(',');
    }

    if (options.queryBy) {
      if (typeof options.queryBy === 'string') {
        return options.queryBy;
      }
      if (Array.isArray(options.queryBy)) {
        return options.queryBy.join(',');
      }
      if (typeof options.queryBy === 'object') {
        const val = options.queryBy[resource];
        if (typeof val === 'string') return val;
        if (Array.isArray(val)) return val.join(',');
      }
    }

    return '*';
  }

  function getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-TYPESENSE-API-KEY': options.apiKey,
      ...options.headers,
    };
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
      let errorMsg = `Typesense request failed (${res.status} ${res.statusText})`;
      try {
        const json = (await res.json()) as Record<string, unknown>;
        if (json && typeof json['message'] === 'string') {
          errorMsg = `${errorMsg}: ${json['message']}`;
        }
      } catch {
        // ignore JSON parse error
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
      const collection = resolveCollection(resource);

      const page = pagination?.current ?? 1;
      const perPage = pagination?.pageSize ?? 10;

      const { filterString, searchQuery } = buildTypesenseFilter(filters);
      const rawQ =
        typeof meta?.['q'] === 'string'
          ? (meta['q'] as string)
          : typeof meta?.['search'] === 'string'
            ? (meta['search'] as string)
            : searchQuery;

      const q = rawQ && rawQ.trim() ? rawQ.trim() : '*';
      const queryBy = resolveQueryBy(resource, meta?.['query_by'] ?? meta?.['queryBy']);

      const queryParams = new URLSearchParams();
      queryParams.set('q', q);
      queryParams.set('query_by', queryBy);
      queryParams.set('page', String(page));
      queryParams.set('per_page', String(perPage));

      if (filterString) {
        queryParams.set('filter_by', filterString);
      }

      if (sorters && sorters.length > 0) {
        queryParams.set(
          'sort_by',
          sorters.map((s) => `${s.field}:${s.order === 'asc' ? 'asc' : 'desc'}`).join(','),
        );
      }

      if (shouldHighlight) {
        const highlightFields = meta?.['highlight_fields'] ?? meta?.['highlightFields'];
        if (typeof highlightFields === 'string') {
          queryParams.set('highlight_fields', highlightFields);
        } else if (Array.isArray(highlightFields)) {
          queryParams.set('highlight_fields', highlightFields.join(','));
        } else {
          queryParams.set('highlight_fields', '*');
        }
      }

      const facets = meta?.['facets'] ?? meta?.['facet_by'] ?? meta?.['facetBy'];
      if (facets) {
        if (typeof facets === 'string') {
          queryParams.set('facet_by', facets);
        } else if (Array.isArray(facets)) {
          queryParams.set('facet_by', facets.join(','));
        }
      }

      if (meta?.['max_facet_values'] !== undefined) {
        queryParams.set('max_facet_values', String(meta['max_facet_values']));
      }

      if (options.additionalSearchParams) {
        for (const [k, v] of Object.entries(options.additionalSearchParams)) {
          if (!queryParams.has(k)) {
            queryParams.set(k, String(v));
          }
        }
      }

      interface TypesenseHit {
        document: Record<string, unknown>;
        highlights?: Array<{
          field: string;
          snippet?: string;
          snippets?: string[];
          value?: string;
        }>;
        text_match?: number;
      }

      interface TypesenseSearchResponse {
        facet_counts?: Array<{
          field_name: string;
          counts: Array<{ count: number; value: string }>;
          stats?: Record<string, unknown>;
        }>;
        found: number;
        hits: TypesenseHit[];
        out_of: number;
        page: number;
        search_time_ms: number;
      }

      const res = await request<TypesenseSearchResponse>(
        `/collections/${collection}/documents/search?${queryParams.toString()}`,
      );

      const total = res.found ?? res.hits.length;

      const data = res.hits.map((hit) => {
        const doc = { ...hit.document };
        if (hit.highlights && hit.highlights.length > 0) {
          doc['_highlight'] = hit.highlights;
        }
        if (primaryKey !== 'id' && doc[primaryKey] !== undefined && doc['id'] === undefined) {
          doc['id'] = doc[primaryKey];
        }
        return doc as unknown as TData;
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
      const collection = resolveCollection(resource);
      const doc = await request<Record<string, unknown>>(
        `/collections/${collection}/documents/${encodeURIComponent(String(id))}`,
      );
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
      const { resource, variables, meta } = params;
      const collection = resolveCollection(resource);
      const action = meta?.['action'] ?? (meta?.['upsert'] ? 'upsert' : 'create');

      const created = await request<Record<string, unknown>>(
        `/collections/${collection}/documents?action=${encodeURIComponent(String(action))}`,
        {
          method: 'POST',
          body: JSON.stringify(variables),
        },
      );

      return {
        data: (created || variables) as unknown as TData,
      };
    },

    update: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: UpdateParams<TVariables>,
    ): Promise<UpdateResult<TData>> => {
      const { resource, id, variables } = params;
      const collection = resolveCollection(resource);

      const updated = await request<Record<string, unknown>>(
        `/collections/${collection}/documents/${encodeURIComponent(String(id))}`,
        {
          method: 'PATCH',
          body: JSON.stringify(variables),
        },
      );

      return {
        data: (updated || { ...variables, [primaryKey]: id }) as unknown as TData,
      };
    },

    deleteOne: async <TData extends BaseRecord = BaseRecord>(
      params: DeleteParams,
    ): Promise<DeleteResult<TData>> => {
      const { resource, id } = params;
      const collection = resolveCollection(resource);

      const deleted = await request<Record<string, unknown>>(
        `/collections/${collection}/documents/${encodeURIComponent(String(id))}`,
        {
          method: 'DELETE',
        },
      );

      return {
        data: (deleted || { [primaryKey]: id }) as unknown as TData,
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
