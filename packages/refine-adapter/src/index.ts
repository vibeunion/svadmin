import { definedOptions } from '@svadmin/core/options';
import type { DataProvider as SvadminDataProvider } from '@svadmin/core';
import { withValidatedResponses, type DataTransport } from '@svadmin/core/schema';

type RequiredRefineDataProvider = Pick<
  DataTransport,
  'getList' | 'getOne' | 'create' | 'update' | 'deleteOne'
>;

type OptionalRefineDataProvider = Partial<
  Pick<DataTransport, 'getApiUrl' | 'getMany' | 'createMany' | 'updateMany' | 'deleteMany' | 'custom'>
>;

export type RefineDataProviderLike = RequiredRefineDataProvider & OptionalRefineDataProvider;

const requiredMethods = [
  'getList',
  'getOne',
  'create',
  'update',
  'deleteOne',
] as const satisfies readonly (keyof RequiredRefineDataProvider)[];

const optionalMethods = [
  'getMany',
  'createMany',
  'updateMany',
  'deleteMany',
  'custom',
] as const satisfies readonly (keyof OptionalRefineDataProvider)[];

function isObjectLike(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

function requireRefineDataProvider(value: unknown): Record<PropertyKey, unknown> {
  if (!isObjectLike(value)) {
    throw new Error('[svadmin] createRefineAdapter: expected a valid Refine DataProvider object, got ' + String(value));
  }

  for (const method of requiredMethods) {
    if (typeof value[method] !== 'function') {
      throw new Error(`[svadmin] createRefineAdapter: missing required Refine DataProvider method "${method}"`);
    }
  }
  for (const method of [...optionalMethods, 'getApiUrl']) {
    if (value[method] !== undefined && typeof value[method] !== 'function') {
      throw new Error(`[svadmin] createRefineAdapter: invalid optional Refine DataProvider method "${method}"`);
    }
  }
  return value;
}

/**
 * Adapter to consume an official @refinedev/* data provider in SvelteAdmin.
 * Refine's DataProvider interface mostly matches the core interface
 * definition of @svadmin/core, except for the current page property.
 */
export function createRefineAdapter(refineProvider: unknown): SvadminDataProvider {
  const source = requireRefineDataProvider(refineProvider);
  function method(name: keyof RefineDataProviderLike) {
    const handler = source[name];
    if (typeof handler !== 'function') throw new TypeError(`Refine DataProvider method "${name}" is unavailable`);
    return handler;
  }
  async function call(name: keyof RefineDataProviderLike, params: unknown): Promise<unknown> {
    const result: unknown = await Reflect.apply(method(name), source, [params]);
    return result;
  }

  const transport: DataTransport = {
    getApiUrl: () => {
      if (source['getApiUrl'] === undefined) return '';
      const result: unknown = Reflect.apply(method('getApiUrl'), source, []);
      if (typeof result !== 'string') throw new TypeError('Refine DataProvider getApiUrl must return a string');
      return result;
    },
    getList(params) {
      const pagination = params.pagination?.current === undefined
        ? params.pagination
        : { ...params.pagination, currentPage: params.pagination.current };
      return call('getList', definedOptions({ ...params, pagination }));
    },
    getOne: params => call('getOne', params),
    create: params => call('create', params),
    update: params => call('update', params),
    deleteOne: params => call('deleteOne', params),
  };

  if (source['getMany'] !== undefined) transport.getMany = params => call('getMany', params);
  if (source['createMany'] !== undefined) transport.createMany = params => call('createMany', params);
  if (source['updateMany'] !== undefined) transport.updateMany = params => call('updateMany', params);
  if (source['deleteMany'] !== undefined) transport.deleteMany = params => call('deleteMany', params);
  if (source['custom'] !== undefined) transport.custom = params => call('custom', params);

  return withValidatedResponses(transport);
}
