import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';

type ProviderInitializer = (client: unknown, options?: unknown) => unknown;
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
 * Creates a Hasura data provider using the official @refinedev/hasura package.
 * Requires `graphql-request` and `@refinedev/hasura` to be installed.
 * 
 * @param client The GraphQLClient instance
 * @param options Optional configuration for the Hasura data provider
 * @returns A fully compatible svadmin DataProvider
 */
export async function createHasuraDataProvider(client: unknown, options?: unknown): Promise<DataProvider> {
  const loaded: unknown = await import('@refinedev/hasura');
  if (!isProviderModule(loaded)) throw new TypeError('Invalid Hasura data provider module');
  const pkg = loaded;
  const init = pkg.default ?? pkg.dataProvider ?? pkg.DataProvider;
  if (!init) throw new Error('No Hasura data provider initializer was found');
  const refineHasuraProvider = init(client, options);
  return createRefineAdapter(refineHasuraProvider);
}
