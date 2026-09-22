import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';


/**
 * Creates a appwrite data provider using the official @refinedev/appwrite package.
 * Requires `@refinedev/appwrite` to be installed.
 * 
 * @param args Arguments required by @refinedev/appwrite
 * @returns A fully compatible svadmin DataProvider
 */
export async function createAppwriteDataProvider(...args: unknown[]): Promise<DataProvider> {
 
  const pkg = await import('@refinedev/appwrite');
  const init = resolveInitializer(pkg);
  const refineProvider = init(...args);
  return createRefineAdapter(refineProvider);
}

export type AppwriteProviderOptions = Record<string, unknown>;

function resolveInitializer(pkg: unknown): (...args: unknown[]) => unknown {
  if (typeof pkg !== 'object' || pkg === null) throw new TypeError('Invalid Appwrite provider module');
  const exports = pkg as Record<string, unknown>;
  for (const key of ['default', 'dataProvider', 'DataProvider']) {
    const candidate = exports[key];
    if (typeof candidate === 'function') return candidate as (...args: unknown[]) => unknown;
  }
  throw new Error('[svadmin] Failed to resolve @refinedev/appwrite data provider. Ensure the package is installed correctly.');
}
