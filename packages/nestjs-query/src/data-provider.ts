import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';


/**
 * Creates a nestjs-query data provider using the official @refinedev/nestjs-query package.
 * Requires `@refinedev/nestjs-query` to be installed.
 * 
 * @param args Arguments required by @refinedev/nestjs-query
 * @returns A fully compatible svadmin DataProvider
 */
export async function createNestjsQueryDataProvider(...args: unknown[]): Promise<DataProvider> {
  const pkg = await import('@refinedev/nestjs-query');
  const init = resolveInitializer(pkg);
  const refineProvider = init(...args);
  return createRefineAdapter(refineProvider);
}

function resolveInitializer(pkg: unknown): (...args: unknown[]) => unknown {
  if (typeof pkg !== 'object' || pkg === null) throw new TypeError('Invalid NestJS Query provider module');
  const exports = pkg as Record<string, unknown>;
  for (const key of ['default', 'dataProvider', 'DataProvider']) {
    const candidate = exports[key];
    if (typeof candidate === 'function') return candidate as (...args: unknown[]) => unknown;
  }
  throw new Error('[svadmin] Failed to resolve @refinedev/nestjs-query data provider. Ensure the package is installed correctly.');
}
