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
} from '@svadmin/core';

export interface JsonApiResourceObject {
  id: string | number;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id: string | number; type: string } | Array<{ id: string | number; type: string }> }>;
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface JsonApiDocument {
  data?: JsonApiResourceObject | JsonApiResourceObject[];
  included?: JsonApiResourceObject[];
  meta?: {
    total?: number;
    count?: number;
    page?: {
      total?: number;
      size?: number;
    };
    [key: string]: unknown;
  };
  links?: Record<string, unknown>;
  errors?: Array<{ status?: string; title?: string; detail?: string }>;
}

export interface JsonApiOptions {
  apiUrl: string;
  httpClient?: typeof fetch;
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  /** Custom pagination strategy, e.g. page[number]/page[size] vs page[offset]/page[limit] */
  paginationStrategy?: 'page' | 'offset';
}

function unpackResource(item: JsonApiResourceObject, includedMap?: Map<string, Record<string, unknown>>): BaseRecord {
  const record: BaseRecord = {
    id: item.id,
    ...(item.attributes ?? {}),
  };

  if (item.relationships && includedMap) {
    for (const [relName, relData] of Object.entries(item.relationships)) {
      if (!relData?.data) continue;
      if (Array.isArray(relData.data)) {
        record[relName] = relData.data.map((ref) => includedMap.get(`${ref.type}:${ref.id}`) ?? { id: ref.id, type: ref.type });
      } else {
        const ref = relData.data;
        record[relName] = includedMap.get(`${ref.type}:${ref.id}`) ?? { id: ref.id, type: ref.type };
      }
    }
  }

  return record;
}

export function createJsonApiDataProvider(options: JsonApiOptions): DataProvider {
  const client = options.httpClient ?? fetch;
  const baseUrl = options.apiUrl.replace(/\/+$/, '');

  async function getHeaders(): Promise<Record<string, string>> {
    const custom = typeof options.headers === 'function' ? await options.headers() : options.headers;
    return {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      ...(custom ?? {}),
    };
  }

  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const headers = await getHeaders();
    const res = await client(url, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string> | undefined),
      },
    });

    if (!res.ok) {
      let detail = `JSON:API request failed with status ${res.status}`;
      try {
        const errDoc = (await res.json()) as JsonApiDocument;
        if (errDoc.errors?.[0]?.detail) {
          detail = errDoc.errors[0].detail;
        }
      } catch {
        // fallback to status detail
      }
      throw new Error(detail);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  }

  return {
    getApiUrl(): string {
      return baseUrl;
    },

    async getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<TData>> {
      const url = new URL(`${baseUrl}/${params.resource}`);

      // Pagination
      if (params.pagination) {
        const current = params.pagination.current ?? 1;
        const pageSize = params.pagination.pageSize ?? 10;
        if (options.paginationStrategy === 'offset') {
          url.searchParams.set('page[offset]', String((current - 1) * pageSize));
          url.searchParams.set('page[limit]', String(pageSize));
        } else {
          url.searchParams.set('page[number]', String(current));
          url.searchParams.set('page[size]', String(pageSize));
        }
      }

      // Sorter
      if (params.sorters && params.sorters.length > 0) {
        const sortString = params.sorters
          .map((s) => (s.order === 'desc' ? `-${s.field}` : s.field))
          .join(',');
        url.searchParams.set('sort', sortString);
      }

      // Filters
      if (params.filters) {
        for (const filter of params.filters) {
          if ('field' in filter && filter.value !== undefined && filter.value !== '') {
            url.searchParams.set(`filter[${filter.field}]`, String(filter.value));
          }
        }
      }

      const doc = await request<JsonApiDocument>(url.toString());

      const includedMap = new Map<string, Record<string, unknown>>();
      if (doc.included && Array.isArray(doc.included)) {
        for (const inc of doc.included) {
          includedMap.set(`${inc.type}:${inc.id}`, { id: inc.id, ...(inc.attributes ?? {}) });
        }
      }

      const items: TData[] = [];
      if (Array.isArray(doc.data)) {
        for (const item of doc.data) {
          items.push(unpackResource(item, includedMap) as TData);
        }
      } else if (doc.data) {
        items.push(unpackResource(doc.data, includedMap) as TData);
      }

      const total =
        doc.meta?.total ??
        doc.meta?.count ??
        doc.meta?.page?.total ??
        items.length;

      return {
        data: items,
        total,
      };
    },

    async getOne<TData extends BaseRecord = BaseRecord>(params: GetOneParams): Promise<GetOneResult<TData>> {
      const url = `${baseUrl}/${params.resource}/${params.id}`;
      const doc = await request<JsonApiDocument>(url);

      if (!doc.data || Array.isArray(doc.data)) {
        throw new Error(`Record ${params.id} not found in resource ${params.resource}`);
      }

      const includedMap = new Map<string, Record<string, unknown>>();
      if (doc.included && Array.isArray(doc.included)) {
        for (const inc of doc.included) {
          includedMap.set(`${inc.type}:${inc.id}`, { id: inc.id, ...(inc.attributes ?? {}) });
        }
      }

      return {
        data: unpackResource(doc.data, includedMap) as TData,
      };
    },

    async create<TData extends BaseRecord = BaseRecord, TVariables = unknown>(
      params: CreateParams<TVariables>
    ): Promise<CreateResult<TData>> {
      const url = `${baseUrl}/${params.resource}`;
      const doc = await request<JsonApiDocument>(url, {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: params.resource,
            attributes: params.variables as Record<string, unknown>,
          },
        }),
      });

      if (!doc.data || Array.isArray(doc.data)) {
        throw new Error(`Failed to create record in resource ${params.resource}`);
      }

      return {
        data: unpackResource(doc.data) as TData,
      };
    },

    async update<TData extends BaseRecord = BaseRecord, TVariables = unknown>(
      params: UpdateParams<TVariables>
    ): Promise<UpdateResult<TData>> {
      const url = `${baseUrl}/${params.resource}/${params.id}`;
      const doc = await request<JsonApiDocument>(url, {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            id: String(params.id),
            type: params.resource,
            attributes: params.variables as Record<string, unknown>,
          },
        }),
      });

      if (!doc.data || Array.isArray(doc.data)) {
        return {
          data: ({ id: params.id, ...(params.variables as object) } as unknown) as TData,
        };
      }

      return {
        data: unpackResource(doc.data) as TData,
      };
    },

    async deleteOne<TData extends BaseRecord = BaseRecord>(params: DeleteParams): Promise<DeleteResult<TData>> {
      const url = `${baseUrl}/${params.resource}/${params.id}`;
      await request(url, {
        method: 'DELETE',
      });

      return {
        data: ({ id: params.id } as unknown) as TData,
      };
    },

    async custom<TData = unknown>(params: CustomParams): Promise<CustomResult<TData>> {
      const endpoint = params.url.startsWith('http') ? params.url : `${baseUrl}/${params.url.replace(/^\/+/, '')}`;
      const requestInit: RequestInit = {
        method: params.method ?? 'GET',
      };
      if (params.payload !== undefined) {
        requestInit.body = JSON.stringify(params.payload);
      }
      if (params.headers !== undefined) {
        requestInit.headers = params.headers as Record<string, string>;
      }
      const res = await request<TData>(endpoint, requestInit);

      return {
        data: res,
      };
    },
  };
}
