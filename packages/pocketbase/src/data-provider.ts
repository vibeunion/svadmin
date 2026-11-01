// @svadmin/pocketbase — PocketBase DataProvider
// Maps svadmin CRUD operations to PocketBase SDK

import { assertFiltersExecutable } from '@svadmin/core/provider-filters';
import type { DataProvider, Filter } from '@svadmin/core';
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

const FIELD_PATH = /^(?:[A-Za-z_][A-Za-z0-9_]*)(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;

function pocketBaseField(field: string): string {
  if (!FIELD_PATH.test(field)) throw new TypeError(`Unsupported PocketBase filter field: ${field}`);
  return field;
}

function quoteString(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function pocketBaseLiteral(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('PocketBase filters reject non-finite numbers');
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return quoteString(value);
  throw new TypeError('PocketBase filters reject this value');
}

function likeLiteral(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('PocketBase text filters require a string');
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function listLiterals(value: unknown, operator: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`PocketBase ${operator} filter requires a non-empty array`);
  }
  return value.map(pocketBaseLiteral);
}

function compilePocketBaseFilter(filter: Filter): string {
  if ('field' in filter) {
    const field = pocketBaseField(filter.field);
    switch (filter.operator) {
      case 'eq': return `${field} = ${pocketBaseLiteral(filter.value)}`;
      case 'ne': return `${field} != ${pocketBaseLiteral(filter.value)}`;
      case 'gt': return `${field} > ${pocketBaseLiteral(filter.value)}`;
      case 'gte': return `${field} >= ${pocketBaseLiteral(filter.value)}`;
      case 'lt': return `${field} < ${pocketBaseLiteral(filter.value)}`;
      case 'lte': return `${field} <= ${pocketBaseLiteral(filter.value)}`;
      case 'contains': return `${field} ~ ${quoteString(likeLiteral(filter.value))}`;
      case 'ncontains': return `${field} !~ ${quoteString(likeLiteral(filter.value))}`;
      case 'startswith': return `${field} ~ ${quoteString(`${likeLiteral(filter.value)}%`)}`;
      case 'nstartswith': return `${field} !~ ${quoteString(`${likeLiteral(filter.value)}%`)}`;
      case 'endswith': return `${field} ~ ${quoteString(`%${likeLiteral(filter.value)}`)}`;
      case 'nendswith': return `${field} !~ ${quoteString(`%${likeLiteral(filter.value)}`)}`;
      case 'null': return `${field} = null`;
      case 'nnull': return `${field} != null`;
      case 'in': return `(${listLiterals(filter.value, 'in').map((item) => `${field} = ${item}`).join(' || ')})`;
      case 'nin': return `(${listLiterals(filter.value, 'nin').map((item) => `${field} != ${item}`).join(' && ')})`;
      case 'between':
      case 'nbetween': {
        const bounds = listLiterals(filter.value, filter.operator);
        if (bounds.length !== 2) throw new TypeError(`PocketBase ${filter.operator} filter requires two values`);
        const [min, max] = bounds;
        return filter.operator === 'between'
          ? `(${field} >= ${min} && ${field} <= ${max})`
          : `(${field} < ${min} || ${field} > ${max})`;
      }
      default:
        throw new Error(`Unsupported PocketBase filter operator: ${String(filter.operator)}`);
    }
  }
  if (filter.operator !== 'and' && filter.operator !== 'or') {
    throw new Error(`Unsupported PocketBase logical operator: ${String(filter.operator)}`);
  }
  if (!Array.isArray(filter.value)) throw new TypeError('PocketBase logical filter requires an array');
  if (filter.value.length === 0) return filter.operator === 'and' ? '(1=1)' : '(1=0)';
  const joiner = filter.operator === 'and' ? ' && ' : ' || ';
  return `(${filter.value.map(compilePocketBaseFilter).join(joiner)})`;
}

function buildFilter(filters?: Filter[]): string | undefined {
  if (!filters?.length) return undefined;
  assertFiltersExecutable('pocketbase', filters);
  return filters.map(compilePocketBaseFilter).join(' && ');
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
        filter: buildFilter(params.filters),
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
