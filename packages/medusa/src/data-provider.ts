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
 * Creates a medusa data provider using the official @refinedev/medusa package.
 * Requires `@refinedev/medusa` to be installed.
 * 
 * @param args Arguments required by @refinedev/medusa
 * @returns A fully compatible svadmin DataProvider
 */
export async function createMedusaDataProvider(...args: unknown[]): Promise<DataProvider> {
  const loaded: unknown = await import('@refinedev/medusa');
  if (!isProviderModule(loaded)) throw new TypeError('Invalid Medusa data provider module');
  const pkg = loaded;
  const init = pkg.default ?? pkg.dataProvider ?? pkg.DataProvider;
  if (!init) throw new Error('No Medusa data provider initializer was found');
  const refineProvider = init(...args);
  return createRefineAdapter(refineProvider);
}
