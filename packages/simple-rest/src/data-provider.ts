import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';


/**
 * Creates a simple-rest data provider using the official @refinedev/simple-rest package.
 * Requires `@refinedev/simple-rest` to be installed.
 * 
 * @param args Arguments required by @refinedev/simple-rest
 * @returns A fully compatible svadmin DataProvider
 */
export async function createSimpleRestDataProvider(...args: unknown[]): Promise<DataProvider> {
  const pkg = await import('@refinedev/simple-rest');
  const init = resolveInitializer(pkg);
  const refineProvider = init(...args);
  return createRefineAdapter(refineProvider);
}

export type SimpleRestOptions = Record<string, unknown>;

function resolveInitializer(pkg: unknown): (...args: unknown[]) => unknown {
  if (typeof pkg !== 'object' || pkg === null) throw new TypeError('Invalid Simple REST provider module');
  const exports = pkg as Record<string, unknown>;
  for (const key of ['default', 'dataProvider', 'DataProvider']) {
    const candidate = exports[key];
    if (typeof candidate === 'function') return candidate as (...args: unknown[]) => unknown;
  }
  throw new Error('[svadmin] Failed to resolve @refinedev/simple-rest data provider. Ensure the package is installed correctly.');
}
