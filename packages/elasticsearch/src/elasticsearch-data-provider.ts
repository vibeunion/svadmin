import type {
  DataProvider,
  GetListParams,
  GetListResult,
  GetOneParams,
  GetOneResult,
  GetManyParams,
  GetManyResult,
  CreateParams,
  CreateResult,
  UpdateParams,
  UpdateResult,
  DeleteOneParams,
  DeleteOneResult,
  BaseRecord,
  Filter,
} from '@svadmin/core';

export interface ElasticsearchOptions {
  node: string;
  apiKey?: string;
  username?: string;
  password?: string;
  headers?: Record<string, string>;
  indexMap?: Record<string, string>;
  fetch?: typeof fetch;
}

function buildQuery(filters?: Filter[]): Record<string, unknown> {
  if (!filters || filters.length === 0) {
    return { match_all: {} };
  }

  const must: Record<string, unknown>[] = [];
  const mustNot: Record<string, unknown>[] = [];

  for (const filter of filters) {
    if ('field' in filter) {
      const field = filter.field;
      const op = filter.operator;
      const value = filter.value;

      switch (op) {
        case 'eq':
          must.push({ term: { [field]: value } });
          break;
        case 'ne':
          mustNot.push({ term: { [field]: value } });
          break;
        case 'contains':
          must.push({ match_phrase: { [field]: value } });
          break;
        case 'gte':
        case 'gt':
        case 'lte':
        case 'lt':
          must.push({ range: { [field]: { [op]: value } } });
          break;
        case 'in':
          must.push({ terms: { [field]: Array.isArray(value) ? value : [value] } });
          break;
        default:
          must.push({ match: { [field]: value } });
      }
    }
  }

  const boolQuery: Record<string, unknown> = {};
  if (must.length > 0) boolQuery.must = must;
  if (mustNot.length > 0) boolQuery.must_not = mustNot;

  return Object.keys(boolQuery).length > 0 ? { bool: boolQuery } : { match_all: {} };
}

export function createElasticsearchDataProvider(options: ElasticsearchOptions): DataProvider {
  const nodeUrl = options.node.replace(/\/+$/, '');
  const customFetch = options.fetch ?? fetch;

  function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    };
    if (options.apiKey) {
      headers.Authorization = `ApiKey ${options.apiKey}`;
    } else if (options.username && options.password) {
      const creds = btoa(`${options.username}:${options.password}`);
      headers.Authorization = `Basic ${creds}`;
    }
    return headers;
  }

  function resolveIndex(resource: string): string {
    return options.indexMap?.[resource] ?? resource;
  }

  return {
    async getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<TData>> {
      const index = resolveIndex(params.resource);
      const page = params.pagination?.current ?? 1;
      const size = params.pagination?.pageSize ?? 10;
      const from = (page - 1) * size;

      const body: Record<string, unknown> = {
        from,
        size,
        query: buildQuery(params.filters),
      };

      if (params.sorters && params.sorters.length > 0) {
        body.sort = params.sorters.map((s) => ({
          [s.field]: { order: s.order.toLowerCase() },
        }));
      }

      const res = await customFetch(`${nodeUrl}/${index}/_search`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Elasticsearch error: ${res.status} ${res.statusText}`);
      }

      const json = await res.json() as {
        hits: {
          total: number | { value: number };
          hits: Array<{ _id: string; _source: Record<string, unknown> }>;
        };
      };

      const total = typeof json.hits.total === 'number' ? json.hits.total : (json.hits.total?.value ?? 0);
      const data = json.hits.hits.map((hit) => ({
        id: hit._id,
        ...hit._source,
      })) as TData[];

      return { data, total };
    },

    async getOne<TData extends BaseRecord = BaseRecord>(params: GetOneParams): Promise<GetOneResult<TData>> {
      const index = resolveIndex(params.resource);
      const res = await customFetch(`${nodeUrl}/${index}/_doc/${params.id}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Elasticsearch document not found: ${params.id}`);
      }

      const json = await res.json() as { _id: string; _source: Record<string, unknown> };
      const data = { id: json._id, ...json._source } as TData;

      return { data };
    },

    async getMany<TData extends BaseRecord = BaseRecord>(params: GetManyParams): Promise<GetManyResult<TData>> {
      const index = resolveIndex(params.resource);
      const res = await customFetch(`${nodeUrl}/${index}/_mget`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ids: params.ids }),
      });

      if (!res.ok) {
        throw new Error(`Elasticsearch _mget error: ${res.status}`);
      }

      const json = await res.json() as {
        docs: Array<{ _id: string; found: boolean; _source?: Record<string, unknown> }>;
      };

      const data = json.docs
        .filter((doc) => doc.found && doc._source)
        .map((doc) => ({ id: doc._id, ...doc._source })) as TData[];

      return { data };
    },

    async create<TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: CreateParams<TVariables>,
    ): Promise<CreateResult<TData>> {
      const index = resolveIndex(params.resource);
      const res = await customFetch(`${nodeUrl}/${index}/_doc`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(params.variables),
      });

      if (!res.ok) {
        throw new Error(`Elasticsearch create error: ${res.status}`);
      }

      const json = await res.json() as { _id: string };
      const data = { id: json._id, ...(params.variables as object) } as TData;

      return { data };
    },

    async update<TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: UpdateParams<TVariables>,
    ): Promise<UpdateResult<TData>> {
      const index = resolveIndex(params.resource);
      const res = await customFetch(`${nodeUrl}/${index}/_update/${params.id}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ doc: params.variables }),
      });

      if (!res.ok) {
        throw new Error(`Elasticsearch update error: ${res.status}`);
      }

      const data = { id: params.id, ...(params.variables as object) } as TData;
      return { data };
    },

    async deleteOne<TData extends BaseRecord = BaseRecord>(params: DeleteOneParams): Promise<DeleteOneResult<TData>> {
      const index = resolveIndex(params.resource);
      const res = await customFetch(`${nodeUrl}/${index}/_doc/${params.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Elasticsearch delete error: ${res.status}`);
      }

      const data = { id: params.id } as TData;
      return { data };
    },
  };
}
