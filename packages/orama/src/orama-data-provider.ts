import type {
  DataProvider,
  BaseRecord,
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
  Filter,
} from '@svadmin/core';

export type OramaDocument = BaseRecord;

export interface OramaCollectionSchema {
  primaryKey?: string;
  searchableFields?: string[];
}

export interface OramaDataProviderOptions {
  primaryKey?: string;
  initialData?: Record<string, OramaDocument[]>;
  collections?: Record<string, OramaCollectionSchema>;
  tolerance?: number; // 0 for exact, 1 or 2 for typo-tolerance
}

/**
 * 评估记录是否满足 svadmin 过滤条件
 */
function matchFilter(record: Record<string, unknown>, filter: Filter): boolean {
  if ('field' in filter) {
    const { field, operator, value } = filter;
    const actual = record[field];

    switch (operator) {
      case 'eq':
        return actual === value;
      case 'ne':
        return actual !== value;
      case 'contains':
        return String(actual ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
      case 'gt':
        return Number(actual) > Number(value);
      case 'gte':
        return Number(actual) >= Number(value);
      case 'lt':
        return Number(actual) < Number(value);
      case 'lte':
        return Number(actual) <= Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(actual);
      case 'nin':
        return Array.isArray(value) && !value.includes(actual);
      default:
        return actual === value;
    }
  }

  if ('operator' in filter && 'value' in filter && Array.isArray(filter.value)) {
    if (filter.operator === 'or') {
      return (filter.value as Filter[]).some(sub => matchFilter(record, sub));
    }
    return (filter.value as Filter[]).every(sub => matchFilter(record, sub));
  }

  return true;
}

/**
 * 计算简单的 Levenshtein 距离以支持轻量级拼写纠错容错 (Typo Tolerance)
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }

  return dp[m]![n]!;
}

/**
 * 创建适用于边缘计算、纯前端与离线应用的高性能 Orama 内存全文与分面检索 DataProvider
 */
export function createOramaDataProvider(options: OramaDataProviderOptions = {}): DataProvider {
  const defaultPk = options.primaryKey || 'id';
  const tolerance = options.tolerance ?? 1;

  // In-memory collection storage
  const stores = new Map<string, Map<string | number, OramaDocument>>();

  if (options.initialData) {
    for (const [res, items] of Object.entries(options.initialData)) {
      const map = new Map<string | number, OramaDocument>();
      for (const item of items) {
        const pk = (item[defaultPk] as string | number) ?? String(Date.now());
        map.set(pk, { ...item, [defaultPk]: pk });
      }
      stores.set(res, map);
    }
  }

  function getStore(resource: string): Map<string | number, OramaDocument> {
    let map = stores.get(resource);
    if (!map) {
      map = new Map();
      stores.set(resource, map);
    }
    return map;
  }

  return {
    getList: async <TData extends BaseRecord = BaseRecord>(
      params: GetListParams,
    ): Promise<GetListResult<TData>> => {
      const { resource, pagination, filters, sorters, meta } = params;
      const store = getStore(resource);
      let records: Record<string, unknown>[] = Array.from(store.values()).map(r => ({ ...r }));

      // 1. Search (Full-text keyword & typo tolerance)
      const searchQuery = (meta?.['search'] as string | undefined) ?? (meta?.['q'] as string | undefined);
      if (searchQuery && searchQuery.trim()) {
        const queryTerm = searchQuery.trim().toLowerCase();
        const schema = options.collections?.[resource];
        const targetFields = schema?.searchableFields;

        records = records
          .map((doc) => {
            let maxScore = 0;
            const entries = Object.entries(doc);

            for (const [key, val] of entries) {
              if (targetFields && !targetFields.includes(key)) continue;
              if (typeof val === 'string' || typeof val === 'number') {
                const str = String(val).toLowerCase();
                if (str.includes(queryTerm)) {
                  maxScore = Math.max(maxScore, 100);
                } else if (tolerance > 0 && queryTerm.length >= 3) {
                  // Fuzzy typo tolerance match
                  const words = str.split(/\s+/);
                  for (const w of words) {
                    if (Math.abs(w.length - queryTerm.length) <= tolerance) {
                      const dist = levenshteinDistance(w, queryTerm);
                      if (dist <= tolerance) {
                        maxScore = Math.max(maxScore, 80 - dist * 10);
                      }
                    }
                  }
                }
              }
            }
            return { doc, score: maxScore };
          })
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(item => ({ ...item.doc, _score: item.score }));
      }

      // 2. Filters
      if (filters && filters.length > 0) {
        records = records.filter(record => filters.every(f => matchFilter(record, f)));
      }

      // 3. Sorters
      if (sorters && sorters.length > 0) {
        records.sort((a, b) => {
          for (const s of sorters) {
            const valA = a[s.field] ?? '';
            const valB = b[s.field] ?? '';
            if (valA === valB) continue;
            const orderFactor = s.order === 'desc' ? -1 : 1;
            return (valA > valB ? 1 : -1) * orderFactor;
          }
          return 0;
        });
      }

      const total = records.length;

      // 4. Pagination
      const current = pagination?.current ?? 1;
      const pageSize = pagination?.pageSize ?? 10;
      const start = (current - 1) * pageSize;
      const paginated = records.slice(start, start + pageSize);

      return {
        data: paginated as unknown as TData[],
        total,
      };
    },

    getOne: async <TData extends BaseRecord = BaseRecord>(
      params: GetOneParams,
    ): Promise<GetOneResult<TData>> => {
      const { resource, id } = params;
      const store = getStore(resource);
      const record = store.get(id);

      if (!record) {
        throw new Error(`Record with id "${id}" not found in resource "${resource}"`);
      }

      return {
        data: { ...record } as unknown as TData,
      };
    },

    create: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: CreateParams<TVariables>,
    ): Promise<CreateResult<TData>> => {
      const { resource, variables } = params;
      const store = getStore(resource);
      const vars = (variables || {}) as Record<string, unknown>;

      const id = (vars[defaultPk] as string | number) ?? `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newDoc: OramaDocument = {
        ...vars,
        [defaultPk]: id,
      };

      store.set(id, newDoc);

      return {
        data: { ...newDoc } as unknown as TData,
      };
    },

    update: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: UpdateParams<TVariables>,
    ): Promise<UpdateResult<TData>> => {
      const { resource, id, variables } = params;
      const store = getStore(resource);
      const existing = store.get(id);

      if (!existing) {
        throw new Error(`Cannot update: record with id "${id}" does not exist in "${resource}"`);
      }

      const updatedDoc: OramaDocument = {
        ...existing,
        ...(variables as Record<string, unknown>),
        [defaultPk]: id,
      };

      store.set(id, updatedDoc);

      return {
        data: { ...updatedDoc } as unknown as TData,
      };
    },

    deleteOne: async <TData extends BaseRecord = BaseRecord>(
      params: DeleteParams,
    ): Promise<DeleteResult<TData>> => {
      const { resource, id } = params;
      const store = getStore(resource);
      const existing = store.get(id);

      if (!existing) {
        throw new Error(`Cannot delete: record with id "${id}" does not exist in "${resource}"`);
      }

      store.delete(id);

      return {
        data: { ...existing } as unknown as TData,
      };
    },

    custom: async <TData = unknown>(
      params: CustomParams,
    ): Promise<CustomResult<TData>> => {
      const { url } = params;
      if (url === 'clear') {
        stores.clear();
        return { data: { cleared: true } as unknown as TData };
      }
      return {
        data: {
          totalCollections: stores.size,
          collections: Array.from(stores.keys()),
        } as unknown as TData,
      };
    },

    getApiUrl: () => 'memory://orama',
  };
}
