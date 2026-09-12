// @svadmin/pocketbase — PocketBase DataProvider
// Maps svadmin CRUD operations to PocketBase SDK

import type {
  DataProvider,
} from '@svadmin/core';
import { definedOptions } from '@svadmin/core/options';
import { withValidatedResponses, type DataTransport } from '@svadmin/core/schema';

interface PocketBaseProviderOptions {
  /** PocketBase client instance */
  pb: PBClient;
}

// SDK results remain unknown until the shared response boundary validates them.
interface PBCollection {
  getList: (page: number, perPage: number, options?: { sort?: string; filter?: string }) => Promise<unknown>;
  getOne: (id: string) => Promise<unknown>;
  getFullList: (options?: { sort?: string; filter?: string; batch?: number }) => Promise<unknown>;
  create: (data: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
}

interface PBClient {
  collection: (name: string) => PBCollection;
  buildUrl: (path: string) => string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inputRecord(value: unknown): Record<string, unknown> {
  if (!isObject(value)) throw new TypeError('PocketBase variables must be an object');
  return value;
}

function buildSort(sorters?: { field: string; order: 'asc' | 'desc' }[]): string | undefined {
  if (!sorters?.length) return undefined;
  return sorters.map(s => s.order === 'desc' ? `-${s.field}` : s.field).join(',');
}

function buildFilter(filters?: { field: string; operator: string; value: unknown }[]): string | undefined {
  if (!filters?.length) return undefined;
  return filters.map(f => {
    const v = f.value;
    switch (f.operator) {
      case 'eq': return `${f.field} = '${v}'`;
      case 'ne': return `${f.field} != '${v}'`;
      case 'contains': return `${f.field} ~ '${v}'`;
      case 'ncontains': return `${f.field} !~ '${v}'`;
      case 'gt': return `${f.field} > '${v}'`;
      case 'gte': return `${f.field} >= '${v}'`;
      case 'lt': return `${f.field} < '${v}'`;
      case 'lte': return `${f.field} <= '${v}'`;
      case 'null': return `${f.field} = ''`;
      case 'nnull': return `${f.field} != ''`;
      case 'in':
        if (!Array.isArray(v)) throw new TypeError('PocketBase in filter requires an array');
        return `${f.field} ?= '${v.join("' || " + f.field + " ?= '")}'`;
      default: return `${f.field} = '${v}'`;
    }
  }).join(' && ');
}

/**
 * Create a DataProvider backed by PocketBase.
 *
 * Usage:
 * ```ts
 * import PocketBase from 'pocketbase';
 * import { createPocketBaseDataProvider } from '@svadmin/pocketbase';
 *
 * const pb = new PocketBase('http://127.0.0.1:8090');
 * const dataProvider = createPocketBaseDataProvider({ pb });
 * ```
 */
export function createPocketBaseDataProvider(options: PocketBaseProviderOptions): DataProvider {
  const pb = options.pb;

  const transport: DataTransport = {
    getApiUrl: () => pb.buildUrl('/api'),

    async getList(params) {
      const page = params.pagination?.current ?? 1;
      const perPage = params.pagination?.pageSize ?? 10;
      const result = await pb.collection(params.resource).getList(page, perPage, definedOptions({
        sort: buildSort(params.sorters),
        filter: buildFilter((params.filters || []).filter((f) => 'field' in f)),
      }));
      if (!isObject(result)) return result;
      return {
        data: result['items'],
        total: result['totalItems'],
      };
    },

    async getOne(params) {
      const record = await pb.collection(params.resource).getOne(String(params.id));
      return { data: record };
    },

    async create(params) {
      const variables = inputRecord(params.variables);
      const record = await pb.collection(params.resource).create(variables);
      return { data: record };
    },

    async update(params) {
      const variables = inputRecord(params.variables);
      const record = await pb.collection(params.resource).update(String(params.id), variables);
      return { data: record };
    },

    async deleteOne(params) {
      const deleted = await pb.collection(params.resource).delete(String(params.id));
      return deleted === true ? { data: { id: params.id } } : undefined;
    },

    async getMany(params) {
      const filter = params.ids.map(id => `id = '${id}'`).join(' || ');
      const records = await pb.collection(params.resource).getFullList({ filter });
      return { data: records };
    },

    async deleteMany(params) {
      const results: unknown[] = [];
      for (const id of params.ids) {
        const deleted = await pb.collection(params.resource).delete(String(id));
        if (deleted !== true) return undefined;
        results.push({ id });
      }
      return { data: results };
    },
  };
  return withValidatedResponses(transport);
}
