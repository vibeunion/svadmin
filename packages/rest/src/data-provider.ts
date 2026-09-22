import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';

/**
 * Creates a data provider from the official `@refinedev/rest` package.
 * Requires `@refinedev/rest` (and its peer `@nestjsx/crud-request`) to be
 * installed. The generic provider is useful for custom REST endpoints that do
 * not match the Simple REST envelope.
 *
 * @param args Arguments required by `@refinedev/rest`
 * @returns A fully compatible svadmin DataProvider
 */
export async function createRestDataProvider(...args: unknown[]): Promise<DataProvider> {
  const pkg = await import('@refinedev/rest');
  const init = resolveInitializer(pkg);
  const refineProvider = init(...args);
  return createRefineAdapter(refineProvider);
}

export type RestDataProviderArgs = unknown[];

function resolveInitializer(pkg: unknown): (...args: unknown[]) => unknown {
  if (typeof pkg !== 'object' || pkg === null) throw new TypeError('Invalid REST provider module');
  const exports = pkg as Record<string, unknown>;
  for (const key of ['default', 'dataProvider', 'DataProvider']) {
    const candidate = exports[key];
    if (typeof candidate === 'function') return candidate as (...args: unknown[]) => unknown;
  }
  throw new Error('[svadmin] Failed to resolve @refinedev/rest. Ensure the package is installed correctly.');
}