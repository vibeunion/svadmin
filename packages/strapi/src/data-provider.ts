import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';


/**
 * Creates a strapi data provider using the official @refinedev/strapi-v4 package.
 * Requires `@refinedev/strapi-v4` to be installed.
 * 
 * @param args Arguments required by @refinedev/strapi-v4
 * @returns A fully compatible svadmin DataProvider
 */
export async function createStrapiDataProvider(...args: unknown[]): Promise<DataProvider> {
  const pkg = await import('@refinedev/strapi-v4');
  const init = resolveInitializer(pkg);
  const refineProvider = init(...args);
  return createRefineAdapter(refineProvider);
}

function resolveInitializer(pkg: unknown): (...args: unknown[]) => unknown {
  if (typeof pkg !== 'object' || pkg === null) throw new TypeError('Invalid Strapi provider module');
  const exports = pkg as Record<string, unknown>;
  for (const key of ['default', 'dataProvider', 'DataProvider']) {
    const candidate = exports[key];
    if (typeof candidate === 'function') return candidate as (...args: unknown[]) => unknown;
  }
  throw new Error('[svadmin] Failed to resolve @refinedev/strapi-v4 data provider. Ensure the package is installed correctly.');
}
