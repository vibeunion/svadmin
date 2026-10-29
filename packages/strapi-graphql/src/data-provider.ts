import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';

/**
 * Creates a Strapi GraphQL data provider from the official
 * `@refinedev/strapi-graphql` package. Requires the package in the host app.
 */
export async function createStrapiGraphQLDataProvider(...args: unknown[]): Promise<DataProvider> {
  const pkg = await import('@refinedev/strapi-graphql');
  const init = resolveInitializer(pkg);
  return createRefineAdapter(init(...args));
}

export type StrapiGraphQLDataProviderArgs = unknown[];

export function resolveInitializer(pkg: unknown): (...args: unknown[]) => unknown {
  if (typeof pkg !== 'object' || pkg === null) throw new TypeError('Invalid Strapi GraphQL provider module');
  const exports = pkg as Record<string, unknown>;
  for (const key of ['createDataProvider', 'default', 'dataProvider', 'DataProvider']) {
    const candidate = exports[key];
    if (typeof candidate === 'function') return candidate as (...args: unknown[]) => unknown;
  }
  throw new Error('[svadmin] Failed to resolve @refinedev/strapi-graphql. Ensure the package is installed correctly.');
}
