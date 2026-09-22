import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';


/**
 * Creates a nestjsx-crud data provider using the official @refinedev/nestjsx-crud package.
 * Requires `@refinedev/nestjsx-crud` to be installed.
 * 
 * @param args Arguments required by @refinedev/nestjsx-crud
 * @returns A fully compatible svadmin DataProvider
 */
export async function createNestjsxCrudDataProvider(...args: unknown[]): Promise<DataProvider> {
  const pkg = await import('@refinedev/nestjsx-crud');
  const init = resolveInitializer(pkg);
  const refineProvider = init(...args);
  return createRefineAdapter(refineProvider);
}

function resolveInitializer(pkg: unknown): (...args: unknown[]) => unknown {
  if (typeof pkg !== 'object' || pkg === null) throw new TypeError('Invalid NestJS CRUD provider module');
  const exports = pkg as Record<string, unknown>;
  for (const key of ['default', 'dataProvider', 'DataProvider']) {
    const candidate = exports[key];
    if (typeof candidate === 'function') return candidate as (...args: unknown[]) => unknown;
  }
  throw new Error('[svadmin] Failed to resolve @refinedev/nestjsx-crud data provider. Ensure the package is installed correctly.');
}
