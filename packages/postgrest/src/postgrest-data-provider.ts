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
  CrudOperator,
} from '@svadmin/core';

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface PostgrestOptions {
  /** PostgREST server API URL, e.g. 'https://api.example.com' */
  apiUrl: string;
  /** Static headers or dynamic header getter (e.g. for JWT tokens) */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>) | undefined;
  /** Custom fetch implementation (for test mock or runtime interceptor) */
  fetch?: FetchLike | undefined;
  /** Primary key field name (default: 'id') */
  primaryKey?: string | undefined;
}

export function mapOperatorToPostgrest(operator: CrudOperator): string {
  switch (operator) {
    case 'eq':
      return 'eq';
    case 'ne':
      return 'neq';
    case 'lt':
      return 'lt';
    case 'lte':
      return 'lte';
    case 'gt':
      return 'gt';
    case 'gte':
      return 'gte';
    case 'in':
      return 'in';
    case 'contains':
      return 'cs';
    case 'containss':
      return 'cd';
    case 'null':
      return 'is.null';
    case 'nnull':
      return 'not.is.null';
    default:
      return 'eq';
  }
}

export function buildPostgrestFilterQuery(filters?: Filter[]): URLSearchParams {
  const params = new URLSearchParams();
  if (!filters || filters.length === 0) {
    return params;
  }

  for (const f of filters) {
    if ('field' in f) {
      const field = f.field;
      const op = f.operator;
      const val = f.value;

      if (op === 'null') {
        params.append(field, 'is.null');
      } else if (op === 'nnull') {
        params.append(field, 'not.is.null');
      } else if (op === 'in') {
        const arr = Array.isArray(val) ? val : [val];
        params.append(field, `in.(${arr.join(',')})`);
      } else if (op === 'contains') {
        params.append(field, `ilike.*${String(val)}*`);
      } else {
        const pgOp = mapOperatorToPostgrest(op);
        params.append(field, `${pgOp}.${String(val)}`);
      }
    }
  }

  return params;
}

export function createPostgrestDataProvider(options: PostgrestOptions): DataProvider {
  const apiUrl = options.apiUrl.replace(/\/+$/, '');
  const fetchFn = options.fetch ?? globalThis.fetch;
  const primaryKey = options.primaryKey ?? 'id';

  async function resolveHeaders(): Promise<Record<string, string>> {
    if (!options.headers) {
      return {};
    }
    if (typeof options.headers === 'function') {
      return await options.headers();
    }
    return options.headers;
  }

  async function request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<{ data: T; count: number | null }> {
    const customHeaders = await resolveHeaders();
    const headers: Record<string, string> = {
      ...customHeaders,
      ...(init?.headers as Record<string, string>),
    };

    const url = path.startsWith('http') ? path : `${apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetchFn(url, {
      ...init,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `PostgREST request failed (${res.status} ${res.statusText})`;
      try {
        const errorJson = (await res.json()) as Record<string, unknown>;
        if (errorJson && typeof errorJson['message'] === 'string') {
          errorMsg = `${errorMsg}: ${errorJson['message']}`;
        }
      } catch {
        // ignore parse error
      }
      throw new Error(errorMsg);
    }

    let count: number | null = null;
    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      const parts = contentRange.split('/');
      if (parts.length === 2 && parts[1] && parts[1] !== '*') {
        const parsed = parseInt(parts[1], 10);
        if (!isNaN(parsed)) {
          count = parsed;
        }
      }
    }

    if (res.status === 204) {
      return { data: {} as T, count };
    }

    const data = (await res.json()) as T;
    return { data, count };
  }

  return {
    getList: async <TData extends BaseRecord = BaseRecord>(
      params: GetListParams,
    ): Promise<GetListResult<TData>> => {
      const { resource, pagination, sorters, filters, meta } = params;
      const queryParams = buildPostgrestFilterQuery(filters);

      const select = typeof meta?.['select'] === 'string' ? (meta['select'] as string) : '*';
      queryParams.set('select', select);

      if (sorters && sorters.length > 0) {
        const orderExpr = sorters
          .map((s) => `${s.field}.${s.order === 'asc' ? 'asc' : 'desc'}`)
          .join(',');
        queryParams.set('order', orderExpr);
      }

      const headers: Record<string, string> = {
        Prefer: 'count=exact',
      };

      if (pagination && pagination.pageSize !== undefined) {
        const current = pagination.current ?? 1;
        const pageSize = pagination.pageSize;
        const from = (current - 1) * pageSize;
        const to = from + pageSize - 1;
        headers['Range-Unit'] = 'items';
        headers['Range'] = `${from}-${to}`;
      }

      const queryString = queryParams.toString();
      const path = `/${resource}${queryString ? `?${queryString}` : ''}`;

      const { data, count } = await request<TData[]>(path, {
        method: 'GET',
        headers,
      });

      return {
        data: Array.isArray(data) ? data : [],
        total: count ?? (Array.isArray(data) ? data.length : 0),
      };
    },

    getOne: async <TData extends BaseRecord = BaseRecord>(
      params: GetOneParams,
    ): Promise<GetOneResult<TData>> => {
      const { resource, id, meta } = params;
      const queryParams = new URLSearchParams();
      const select = typeof meta?.['select'] === 'string' ? (meta['select'] as string) : '*';
      queryParams.set('select', select);
      queryParams.set(primaryKey, `eq.${id}`);

      const { data } = await request<TData>(`/${resource}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.pgrst.object+json',
        },
      });

      return {
        data,
      };
    },

    create: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: CreateParams<TVariables>,
    ): Promise<CreateResult<TData>> => {
      const { resource, variables } = params;
      const { data } = await request<TData>(`/${resource}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          Accept: 'application/vnd.pgrst.object+json',
        },
        body: JSON.stringify(variables),
      });

      return {
        data,
      };
    },

    update: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: UpdateParams<TVariables>,
    ): Promise<UpdateResult<TData>> => {
      const { resource, id, variables } = params;
      const queryParams = new URLSearchParams();
      queryParams.set(primaryKey, `eq.${id}`);

      const { data } = await request<TData>(`/${resource}?${queryParams.toString()}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          Accept: 'application/vnd.pgrst.object+json',
        },
        body: JSON.stringify(variables),
      });

      return {
        data,
      };
    },

    deleteOne: async <TData extends BaseRecord = BaseRecord>(
      params: DeleteParams,
    ): Promise<DeleteResult<TData>> => {
      const { resource, id } = params;
      const queryParams = new URLSearchParams();
      queryParams.set(primaryKey, `eq.${id}`);

      const { data } = await request<TData>(`/${resource}?${queryParams.toString()}`, {
        method: 'DELETE',
        headers: {
          Prefer: 'return=representation',
          Accept: 'application/vnd.pgrst.object+json',
        },
      });

      return {
        data: (data && Object.keys(data).length > 0 ? data : ({ [primaryKey]: id } as unknown)) as TData,
      };
    },

    custom: async (params: CustomParams): Promise<CustomResult> => {
      const { url, method = 'get', headers: customH, payload } = params;
      const reqHeaders: Record<string, string> = {
        ...(customH && typeof customH === 'object' ? (customH as Record<string, string>) : {}),
      };

      if (payload) {
        reqHeaders['Content-Type'] = 'application/json';
      }

      const { data } = await request(url, {
        method: method.toUpperCase(),
        headers: reqHeaders,
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });

      return { data };
    },

    getApiUrl: () => apiUrl,
  };
}
