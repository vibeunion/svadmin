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
  Sort,
} from '@svadmin/core';

export interface ClickHouseClientLike {
  query: (params: { query: string; format?: string; query_params?: Record<string, unknown> }) => Promise<{
    json: () => Promise<unknown>;
  }>;
}

export interface ClickHouseOptions {
  /** ClickHouse HTTP endpoint URL if no client is provided, e.g. 'http://localhost:8123' */
  url?: string;
  /** Optional database name */
  database?: string;
  /** Optional HTTP basic authorization header */
  authorization?: string;
  /** Custom fetch function */
  fetch?: typeof fetch;
}

function sanitizeIdentifier(name: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Invalid ClickHouse table or column name: ${name}`);
  }
  return name;
}

function buildWhereClause(filters?: Filter[]): string {
  if (!filters || filters.length === 0) return '';
  const clauses: string[] = [];

  for (const filter of filters) {
    if ('field' in filter && filter.field) {
      const field = sanitizeIdentifier(filter.field);
      const op = filter.operator;
      const value = filter.value;

      if (op === 'eq') {
        clauses.push(typeof value === 'string' ? `${field} = '${value.replace(/'/g, "\\'")}'` : `${field} = ${value}`);
      } else if (op === 'ne') {
        clauses.push(typeof value === 'string' ? `${field} != '${value.replace(/'/g, "\\'")}'` : `${field} != ${value}`);
      } else if (op === 'lt') {
        clauses.push(`${field} < ${Number(value)}`);
      } else if (op === 'lte') {
        clauses.push(`${field} <= ${Number(value)}`);
      } else if (op === 'gt') {
        clauses.push(`${field} > ${Number(value)}`);
      } else if (op === 'gte') {
        clauses.push(`${field} >= ${Number(value)}`);
      } else if (op === 'contains') {
        clauses.push(`${field} LIKE '%${String(value).replace(/'/g, "\\'")}%'`);
      } else if (op === 'in' && Array.isArray(value)) {
        const list = value.map((v) => (typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : String(v))).join(', ');
        clauses.push(`${field} IN (${list})`);
      }
    }
  }

  return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
}

function buildOrderBy(sorters?: Sort[]): string {
  if (!sorters || sorters.length === 0) return '';
  const parts = sorters.map((s: Sort) => `${sanitizeIdentifier(s.field)} ${s.order.toUpperCase()}`);
  return `ORDER BY ${parts.join(', ')}`;
}

export function createClickHouseDataProvider(
  clientOrOptions: ClickHouseClientLike | ClickHouseOptions,
): DataProvider {
  const isClient = 'query' in clientOrOptions && typeof clientOrOptions.query === 'function';
  const customFetch = !isClient ? (clientOrOptions as ClickHouseOptions).fetch ?? fetch : fetch;
  const baseUrl = !isClient ? (clientOrOptions as ClickHouseOptions).url ?? 'http://localhost:8123' : '';
  const database = !isClient ? (clientOrOptions as ClickHouseOptions).database : undefined;
  const authHeader = !isClient ? (clientOrOptions as ClickHouseOptions).authorization : undefined;

  async function executeSql(sql: string): Promise<Record<string, unknown>[]> {
    if (isClient) {
      const res = await (clientOrOptions as ClickHouseClientLike).query({
        query: sql,
        format: 'JSON',
      });
      const data = (await res.json()) as { data?: Record<string, unknown>[] };
      return data.data ?? [];
    }

    const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
    if (authHeader) headers['Authorization'] = authHeader;
    if (database) headers['X-ClickHouse-Database'] = database;

    const response = await customFetch(`${baseUrl}/?default_format=JSON`, {
      method: 'POST',
      headers,
      body: sql,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ClickHouse query failed (${response.status}): ${errText}`);
    }

    const body = (await response.json()) as { data?: Record<string, unknown>[] };
    return body.data ?? [];
  }

  return {
    getApiUrl: () => baseUrl,

    async getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResult<TData>> {
      const table = sanitizeIdentifier(params.resource);
      const where = buildWhereClause(params.filters);
      const order = buildOrderBy(params.sorters);

      const page = params.pagination?.current ?? 1;
      const pageSize = params.pagination?.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      const dataQuery = `SELECT * FROM ${table} ${where} ${order} LIMIT ${pageSize} OFFSET ${offset} FORMAT JSON`;
      const countQuery = `SELECT count() AS total FROM ${table} ${where} FORMAT JSON`;

      const [data, countResult] = await Promise.all([
        executeSql(dataQuery),
        executeSql(countQuery),
      ]);

      const firstRow = countResult[0];
      const countVal = firstRow ? firstRow['total'] : undefined;
      const total = Number(countVal ?? data.length);

      return {
        data: data as unknown as TData[],
        total,
      };
    },

    async getOne<TData extends BaseRecord = BaseRecord>(params: GetOneParams): Promise<GetOneResult<TData>> {
      const table = sanitizeIdentifier(params.resource);
      const idStr = typeof params.id === 'string' ? `'${params.id.replace(/'/g, "\\'")}'` : params.id;
      const sql = `SELECT * FROM ${table} WHERE id = ${idStr} LIMIT 1 FORMAT JSON`;
      const rows = await executeSql(sql);

      if (rows.length === 0) {
        throw new Error(`Record with id ${params.id} not found in ${params.resource}`);
      }

      return {
        data: rows[0] as unknown as TData,
      };
    },

    async create<TData extends BaseRecord = BaseRecord>(params: CreateParams): Promise<CreateResult<TData>> {
      const table = sanitizeIdentifier(params.resource);
      const variables = params.variables as Record<string, unknown>;
      const keys = Object.keys(variables).map(sanitizeIdentifier);
      const values = Object.values(variables).map((val) =>
        typeof val === 'string' ? `'${val.replace(/'/g, "\\'")}'` : String(val),
      );

      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')})`;
      await executeSql(sql);

      return {
        data: variables as unknown as TData,
      };
    },

    async update<TData extends BaseRecord = BaseRecord>(params: UpdateParams): Promise<UpdateResult<TData>> {
      const table = sanitizeIdentifier(params.resource);
      const idStr = typeof params.id === 'string' ? `'${params.id.replace(/'/g, "\\'")}'` : params.id;
      const variables = params.variables as Record<string, unknown>;
      const assignments = Object.entries(variables).map(([k, v]) => {
        const val = typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : String(v);
        return `${sanitizeIdentifier(k)} = ${val}`;
      });

      const sql = `ALTER TABLE ${table} UPDATE ${assignments.join(', ')} WHERE id = ${idStr}`;
      await executeSql(sql);

      return {
        data: { id: params.id, ...variables } as unknown as TData,
      };
    },

    async deleteOne<TData extends BaseRecord = BaseRecord>(params: DeleteParams): Promise<DeleteResult<TData>> {
      const table = sanitizeIdentifier(params.resource);
      const idStr = typeof params.id === 'string' ? `'${params.id.replace(/'/g, "\\'")}'` : params.id;
      const sql = `ALTER TABLE ${table} DELETE WHERE id = ${idStr}`;
      await executeSql(sql);

      return {
        data: { id: params.id } as unknown as TData,
      };
    },

    async custom<TData = unknown>(params: CustomParams): Promise<CustomResult<TData>> {
      const metaQuery = params.meta && typeof params.meta['query'] === 'string' ? (params.meta['query'] as string) : undefined;
      const sql = metaQuery ?? params.url;
      if (!sql) {
        throw new Error('ClickHouse custom query requires params.meta.query or params.url');
      }
      const data = await executeSql(sql);
      return {
        data: data as unknown as TData,
      };
    },
  };
}