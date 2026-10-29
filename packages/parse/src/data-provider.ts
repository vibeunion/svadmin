import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';

/**
 * Creates a Parse data provider from the official `@refinedev/parse` package.
 * Requires `@refinedev/parse` to be installed in the host application.
 */
export async function createParseDataProvider(...args: unknown[]): Promise<DataProvider> {
  const pkg = await import('@refinedev/parse');
  const init = resolveInitializer(pkg);
  return createRefineAdapter(init(...args));
}

export type ParseDataProviderArgs = unknown[];

export function resolveInitializer(pkg: unknown): (...args: unknown[]) => unknown {
  if (typeof pkg !== 'object' || pkg === null) throw new TypeError('Invalid Parse provider module');
  const exports = pkg as Record<string, unknown>;
  for (const key of ['createDataProvider', 'default', 'dataProvider', 'DataProvider']) {
    const candidate = exports[key];
    if (typeof candidate === 'function') return candidate as (...args: unknown[]) => unknown;
  }
  throw new Error('[svadmin] Failed to resolve @refinedev/parse. Ensure the package is installed correctly.');
}
