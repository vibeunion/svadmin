/**
 * @svadmin/drizzle — Drizzle ORM DataProvider adapter
 *
 * Thin wrapper around refine-sqlx that returns a @svadmin/core DataProvider.
 * Supports SQLite, PostgreSQL, MySQL, and Cloudflare D1.
 *
 * @example
 * ```ts
 * import { createDrizzleDataProvider } from '@svadmin/drizzle';
 * import { drizzle } from 'drizzle-orm/bun-sqlite';
 * import * as schema from './schema';
 *
 * const db = drizzle({ client: new Database(':memory:'), schema });
 * const dataProvider = await createDrizzleDataProvider({ connection: db, schema });
 * ```
 */

import type { DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';
import type { RefineSQLConfig } from 'refine-sqlx';
import { createRefineSQL } from 'refine-sqlx';

export type { RefineSQLConfig } from 'refine-sqlx';

/**
 * Create a svadmin DataProvider backed by Drizzle ORM.
 *
 * Wraps refine-sqlx's `createRefineSQL()` and returns a `@svadmin/core` DataProvider.
 * The shared adapter validates method availability and every response envelope
 * before database results enter the application's typed data layer.
 *
 * @param config - refine-sqlx configuration (connection, schema, features, etc.)
 * @returns A @svadmin/core DataProvider
 *
 * @example
 * ```ts
 * import { createDrizzleDataProvider } from '@svadmin/drizzle';
 * import { drizzle } from 'drizzle-orm/bun-sqlite';
 * import { Database } from 'bun:sqlite';
 * import * as schema from './schema';
 *
 * const db = drizzle({ client: new Database('./app.db'), schema });
 *
 * const dataProvider = await createDrizzleDataProvider({
 *   connection: db,
 *   schema,
 *   softDelete: { enabled: true },
 *   features: {
 *     relations: { enabled: true },
 *     transactions: { enabled: true },
 *   },
 * });
 * ```
 */
export async function createDrizzleDataProvider<
  TSchema extends Record<string, unknown>,
>(config: RefineSQLConfig<TSchema>): Promise<DataProvider> {
  const provider: unknown = await createRefineSQL(config);
  return createRefineAdapter(provider);
}
