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

export interface QdrantOptions {
  /** Base URL of the Qdrant instance, e.g. 'http://localhost:6333' or Qdrant Cloud URL */
  host: string;
  /** Qdrant API Key (for Qdrant Cloud or API key protected instances) */
  apiKey?: string | undefined;
  /** Custom request headers */
  headers?: Record<string, string> | undefined;
  /** Optional mapping translating svadmin resource names to Qdrant collection names */
  collectionMap?: Record<string, string> | undefined;
  /** Primary identifier key field (default: 'id') */
  primaryKey?: string | undefined;
  /** Custom fetch implementation (useful for tests or runtime hooks) */
  fetch?: FetchLike | undefined;
}

export interface QdrantFilterGroup {
  must?: unknown[];
  must_not?: unknown[];
  should?: unknown[];
}

export function buildQdrantFilter(filters?: Filter[]): QdrantFilterGroup | undefined {
  if (!filters || filters.length === 0) {
    return undefined;
  }

  const mustConditions: unknown[] = [];
  const mustNotConditions: unknown[] = [];
  const shouldConditions: unknown[] = [];

  for (const f of filters) {
    if ('field' in f) {
      const field = f.field;
      const op = f.operator;
      const val = f.value;

      switch (op) {
        case 'eq':
          mustConditions.push({ key: field, match: { value: val } });
          break;
        case 'ne':
          mustNotConditions.push({ key: field, match: { value: val } });
          break;
        case 'gt':
          mustConditions.push({ key: field, range: { gt: val } });
          break;
        case 'gte':
          mustConditions.push({ key: field, range: { gte: val } });
          break;
        case 'lt':
          mustConditions.push({ key: field, range: { lt: val } });
          break;
        case 'lte':
          mustConditions.push({ key: field, range: { lte: val } });
          break;
        case 'in': {
          const arr = Array.isArray(val) ? val : [val];
          mustConditions.push({ key: field, match: { any: arr } });
          break;
        }
        case 'nin': {
          const arr = Array.isArray(val) ? val : [val];
          mustNotConditions.push({ key: field, match: { any: arr } });
          break;
        }
        case 'null':
          mustConditions.push({ is_null: { key: field } });
          break;
        case 'nnull':
          mustConditions.push({ is_empty: { key: field } });
          break;
        default:
          mustConditions.push({ key: field, match: { value: val } });
      }
    } else if ('operator' in f && 'value' in f && Array.isArray(f.value)) {
      const subFilters = f.value
        .map((child) => buildQdrantFilter([child]))
        .filter((res): res is QdrantFilterGroup => res !== undefined);

      if (subFilters.length > 0) {
        if (f.operator.toUpperCase() === 'OR') {
          shouldConditions.push(...subFilters);
        } else {
          mustConditions.push(...subFilters);
        }
      }
    }
  }

  const result: QdrantFilterGroup = {};
  if (mustConditions.length > 0) result.must = mustConditions;
  if (mustNotConditions.length > 0) result.must_not = mustNotConditions;
  if (shouldConditions.length > 0) result.should = shouldConditions;

  return Object.keys(result).length > 0 ? result : undefined;
}

export function createQdrantDataProvider(options: QdrantOptions): DataProvider {
  const host = options.host.replace(/\/+$/, '');
  const fetchFn = options.fetch ?? globalThis.fetch;
  const primaryKey = options.primaryKey ?? 'id';

  function resolveCollection(resource: string): string {
    return options.collectionMap?.[resource] ?? resource;
  }

  function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (options.apiKey) {
      headers['api-key'] = options.apiKey;
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
      let errorMsg = `Qdrant request failed (${res.status} ${res.statusText})`;
      try {
        const json = (await res.json()) as Record<string, unknown>;
        if (json && typeof json['status'] === 'string') {
          errorMsg = `${errorMsg}: ${json['status']}`;
        } else if (json?.['status'] && typeof (json['status'] as Record<string, unknown>)?.['error'] === 'string') {
          errorMsg = `${errorMsg}: ${(json['status'] as Record<string, unknown>)['error']}`;
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
      const { resource, pagination, filters, meta } = params;
      const collection = resolveCollection(resource);

      const page = pagination?.current ?? 1;
      const pageSize = pagination?.pageSize ?? 10;
      const offset = (page - 1) * pageSize;

      const qdrantFilter = buildQdrantFilter(filters);
      const queryVector = meta?.['vector'] as number[] | undefined;

      let records: TData[] = [];
      let total = 0;

      // 1. Vector similarity search mode
      if (Array.isArray(queryVector) && queryVector.length > 0) {
        interface QdrantSearchResponse {
          result: Array<{
            id: string | number;
            score?: number;
            payload?: Record<string, unknown>;
            version?: number;
          }>;
          status: string;
          time: number;
        }

        const body: Record<string, unknown> = {
          vector: queryVector,
          limit: pageSize,
          offset,
          with_payload: true,
          with_vector: Boolean(meta?.['with_vector']),
        };

        if (qdrantFilter) {
          body['filter'] = qdrantFilter;
        }

        const res = await request<QdrantSearchResponse>(
          `/collections/${collection}/points/search`,
          {
            method: 'POST',
            body: JSON.stringify(body),
          },
        );

        records = (res.result || []).map((hit) => {
          const doc: Record<string, unknown> = {
            id: hit.id,
            _score: hit.score,
            ...(hit.payload || {}),
          };
          if (primaryKey !== 'id' && doc[primaryKey] !== undefined && doc['id'] === undefined) {
            doc['id'] = doc[primaryKey];
          }
          return doc as unknown as TData;
        });

        total = records.length;
      } else {
        // 2. Standard point scroll browsing mode
        interface QdrantScrollResponse {
          result: {
            points: Array<{
              id: string | number;
              payload?: Record<string, unknown>;
              vector?: unknown;
            }>;
            next_page_offset?: string | number | null;
          };
          status: string;
          time: number;
        }

        const body: Record<string, unknown> = {
          limit: pageSize,
          with_payload: true,
          with_vector: Boolean(meta?.['with_vector']),
        };

        if (meta?.['offset'] !== undefined) {
          body['offset'] = meta['offset'];
        }

        if (qdrantFilter) {
          body['filter'] = qdrantFilter;
        }

        const res = await request<QdrantScrollResponse>(
          `/collections/${collection}/points/scroll`,
          {
            method: 'POST',
            body: JSON.stringify(body),
          },
        );

        records = (res.result?.points || []).map((p) => {
          const doc: Record<string, unknown> = {
            id: p.id,
            ...(p.payload || {}),
          };
          if (primaryKey !== 'id' && doc[primaryKey] !== undefined && doc['id'] === undefined) {
            doc['id'] = doc[primaryKey];
          }
          return doc as unknown as TData;
        });

        total = records.length;
      }

      // 3. Fetch exact total points count if requested
      if (meta?.['exact_count'] !== false) {
        try {
          interface QdrantCountResponse {
            result: { count: number };
            status: string;
          }
          const countBody: Record<string, unknown> = { exact: true };
          if (qdrantFilter) countBody['filter'] = qdrantFilter;

          const countRes = await request<QdrantCountResponse>(
            `/collections/${collection}/points/count`,
            {
              method: 'POST',
              body: JSON.stringify(countBody),
            },
          );
          if (countRes.result?.count !== undefined) {
            total = countRes.result.count;
          }
        } catch {
          // Fallback to records.length if count endpoint is unavailable
        }
      }

      return {
        data: records,
        total,
      };
    },

    getOne: async <TData extends BaseRecord = BaseRecord>(
      params: GetOneParams,
    ): Promise<GetOneResult<TData>> => {
      const { resource, id } = params;
      const collection = resolveCollection(resource);

      interface QdrantGetPointResponse {
        result: {
          id: string | number;
          payload?: Record<string, unknown>;
          vector?: unknown;
        };
      }

      const res = await request<QdrantGetPointResponse>(
        `/collections/${collection}/points/${encodeURIComponent(String(id))}`,
      );

      const point = res.result;
      const doc: Record<string, unknown> = {
        id: point.id,
        ...(point.payload || {}),
      };

      if (primaryKey !== 'id' && doc[primaryKey] !== undefined && doc['id'] === undefined) {
        doc['id'] = doc[primaryKey];
      }

      return {
        data: doc as unknown as TData,
      };
    },

    create: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: CreateParams<TVariables>,
    ): Promise<CreateResult<TData>> => {
      const { resource, variables } = params;
      const collection = resolveCollection(resource);

      const vars = (variables || {}) as Record<string, unknown>;
      const pointId = vars[primaryKey] ?? vars['id'] ?? (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()));
      const vector = vars['vector'] ?? [0.0];

      // Exclude vector, id, and primaryKey from point payload to prevent redundancy
      const payload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(vars)) {
        if (key !== 'vector' && key !== 'id' && key !== primaryKey) {
          payload[key] = val;
        }
      }

      const body = {
        points: [
          {
            id: pointId,
            vector,
            payload,
          },
        ],
      };

      await request(`/collections/${collection}/points?wait=true`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      return {
        data: {
          id: pointId,
          ...payload,
        } as unknown as TData,
      };
    },

    update: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: UpdateParams<TVariables>,
    ): Promise<UpdateResult<TData>> => {
      const { resource, id, variables } = params;
      const collection = resolveCollection(resource);

      const vars = (variables || {}) as Record<string, unknown>;
      const { vector, ...payloadToUpdate } = vars;

      // 1. Update payload attributes
      await request(`/collections/${collection}/points/payload?wait=true`, {
        method: 'POST',
        body: JSON.stringify({
          points: [id],
          payload: payloadToUpdate,
        }),
      });

      // 2. Update vector if provided
      if (Array.isArray(vector)) {
        await request(`/collections/${collection}/points/vectors?wait=true`, {
          method: 'PUT',
          body: JSON.stringify({
            points: [
              {
                id,
                vector,
              },
            ],
          }),
        });
      }

      return {
        data: {
          id,
          ...vars,
        } as unknown as TData,
      };
    },

    deleteOne: async <TData extends BaseRecord = BaseRecord>(
      params: DeleteParams,
    ): Promise<DeleteResult<TData>> => {
      const { resource, id } = params;
      const collection = resolveCollection(resource);

      await request(`/collections/${collection}/points/delete?wait=true`, {
        method: 'POST',
        body: JSON.stringify({
          points: [id],
        }),
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
