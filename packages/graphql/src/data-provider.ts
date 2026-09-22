import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';

type ProviderInitializer = (...args: unknown[]) => unknown;
type ProviderModule = {
  default?: ProviderInitializer;
  dataProvider?: ProviderInitializer;
  DataProvider?: ProviderInitializer;
};

function isProviderModule(value: unknown): value is ProviderModule {
  if (typeof value !== 'object' || value === null) return false;
  const module = value as Record<string, unknown>;
  return ['default', 'dataProvider', 'DataProvider'].some((key) => {
    const candidate = module[key];
    return candidate === undefined || typeof candidate === 'function';
  });
}

/**
 * Creates a graphql data provider using the official @refinedev/graphql package.
 * Requires `@refinedev/graphql` to be installed.
 * 
 * @param args Arguments required by @refinedev/graphql
 * @returns A fully compatible svadmin DataProvider
 */
export async function createGraphQLDataProvider(...args: unknown[]): Promise<DataProvider> {
  const loaded: unknown = await import('@refinedev/graphql');
  if (!isProviderModule(loaded)) throw new TypeError('Invalid GraphQL data provider module');
  const pkg = loaded;
  const init = pkg.default ?? pkg.dataProvider ?? pkg.DataProvider;
  if (!init) throw new Error('No GraphQL data provider initializer was found');
  const refineProvider = init(...args);
  return createRefineAdapter(refineProvider);
}

export type GraphQLDataProviderOptions = unknown;
