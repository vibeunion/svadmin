import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';


/**
 * Creates a airtable data provider using the official @refinedev/airtable package.
 * Requires `@refinedev/airtable` to be installed.
 * 
 * @param args Arguments required by @refinedev/airtable
 * @returns A fully compatible svadmin DataProvider
 */
export async function createAirtableDataProvider(...args: unknown[]): Promise<DataProvider> {
  const pkg = await import('@refinedev/airtable');
  const init = resolveInitializer(pkg);
  const refineProvider = init(...args);
  return createRefineAdapter(refineProvider);
}

function resolveInitializer(pkg: unknown): (...args: unknown[]) => unknown {
  if (typeof pkg !== 'object' || pkg === null) throw new TypeError('Invalid Airtable provider module');
  const exports = pkg as Record<string, unknown>;
  for (const key of ['default', 'dataProvider', 'DataProvider']) {
    const candidate = exports[key];
    if (typeof candidate === 'function') return candidate as (...args: unknown[]) => unknown;
  }
  throw new Error('[svadmin] Failed to resolve @refinedev/airtable data provider. Ensure the package is installed correctly.');
}
