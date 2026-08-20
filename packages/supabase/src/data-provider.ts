import type { CustomParams, CustomResult, DataProvider } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';
import type { SupabaseClient } from '@supabase/supabase-js';
// Static import — dynamic import() gets dropped by Vite/Rollup in static SPA builds
import { dataProvider as refineDataProvider } from '@refinedev/supabase';

export interface CreateSupabaseDataProviderOptions {
  /** Default schema for table and RPC operations */
  schema?: string;
}

/**
 * Creates a supabase data provider using the official @refinedev/supabase package
 * with full support for custom RPC calls, Edge Functions, and schema targeting.
 *
 * @param client SupabaseClient instance
 * @param options Optional provider configuration
 * @returns A fully compatible svadmin DataProvider with custom RPC support
 */
export function createSupabaseDataProvider(
  client: SupabaseClient,
  options: CreateSupabaseDataProviderOptions = {}
): DataProvider {
  if (typeof refineDataProvider !== 'function') {
    throw new Error(
      '[svadmin/supabase] Failed to resolve @refinedev/supabase data provider. ' +
      'Ensure the package is installed correctly: bun add @refinedev/supabase'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refineProvider = refineDataProvider(client as any);
  const adapter = createRefineAdapter(refineProvider);

  // Provide first-class custom implementation for Supabase
  adapter.custom = async <TData = unknown, TVariables = unknown>({
    url,
    method = 'get',
    payload,
    query,
    headers,
    filters,
    sorters,
    meta,
  }: CustomParams<TVariables>): Promise<CustomResult<TData>> => {
    const targetSchema = (meta?.schema as string | undefined) ?? options.schema;
    const targetClient = targetSchema ? client.schema(targetSchema) : client;

    // 1. Edge Function invocation
    const isEdgeFunction =
      meta?.function === true ||
      meta?.edgeFunction === true ||
      url.startsWith('functions/') ||
      url.startsWith('functions:');

    if (isEdgeFunction) {
      const functionName = url.replace(/^functions[/:]/, '');
      const { data, error } = await client.functions.invoke(functionName, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: payload as any,
        headers: headers as Record<string, string>,
      });

      if (error) {
        throw new Error(
          `[svadmin/supabase] Edge Function "${functionName}" failed: ${error.message}`
        );
      }

      return { data: data as TData };
    }

    // 2. PostgreSQL Stored Procedure / RPC
    const isExplicitRpc =
      meta?.rpc === true ||
      url.startsWith('rpc/') ||
      url.startsWith('rpc:');
    const isImplicitRpc =
      !isExplicitRpc &&
      meta?.rpc !== false &&
      !url.startsWith('http://') &&
      !url.startsWith('https://') &&
      !url.includes('/') &&
      (method === 'post' || meta?.rpc === true);

    if (isExplicitRpc || (isImplicitRpc && meta?.rpc === true)) {
      const functionName = url.replace(/^rpc[/:]/, '');
      const rpcArgs = (payload ?? query ?? {}) as Record<string, unknown>;
      const rpcOptions: { head?: boolean; count?: 'exact' | 'planned' | 'estimated'; get?: boolean } = {};
      if (meta?.head) rpcOptions.head = Boolean(meta.head);
      if (meta?.count) rpcOptions.count = meta.count as 'exact' | 'planned' | 'estimated';
      if (meta?.get) rpcOptions.get = Boolean(meta.get);

      const { data, error } = await targetClient.rpc(functionName, rpcArgs, rpcOptions);

      if (error) {
        throw new Error(
          `[svadmin/supabase] RPC function "${functionName}" failed: ${error.message}`
        );
      }

      return { data: data as TData };
    }

    // 3. Direct Table / View Query via PostgREST client
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const dbQuery = targetClient.from(url);

      if (method === 'get') {
        let selectQuery = dbQuery.select((meta?.select as string) ?? '*');
        if (query) {
          for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null) {
              selectQuery = selectQuery.eq(key, value);
            }
          }
        }
        if (filters && Array.isArray(filters)) {
          for (const filter of filters) {
            if ('field' in filter && 'value' in filter) {
              selectQuery = selectQuery.eq(filter.field, filter.value);
            }
          }
        }
        if (sorters && Array.isArray(sorters)) {
          for (const sorter of sorters) {
            selectQuery = selectQuery.order(sorter.field, {
              ascending: sorter.order === 'asc',
            });
          }
        }
        const { data, error } = await selectQuery;
        if (error) {
          throw new Error(`[svadmin/supabase] Query "${url}" failed: ${error.message}`);
        }
        return { data: data as TData };
      }

      if (method === 'post') {
        const { data, error } = await dbQuery
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(payload as any)
          .select((meta?.select as string) ?? '*');
        if (error) {
          throw new Error(`[svadmin/supabase] Insert into "${url}" failed: ${error.message}`);
        }
        return { data: (Array.isArray(data) ? data[0] : data) as TData };
      }

      if (method === 'put' || method === 'patch') {
        let updateQuery = dbQuery
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(payload as any);
        if (query) {
          for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null) {
              updateQuery = updateQuery.eq(key, value);
            }
          }
        }
        const { data, error } = await updateQuery.select((meta?.select as string) ?? '*');
        if (error) {
          throw new Error(`[svadmin/supabase] Update "${url}" failed: ${error.message}`);
        }
        return { data: (Array.isArray(data) ? data[0] : data) as TData };
      }

      if (method === 'delete') {
        let deleteQuery = dbQuery.delete();
        if (query) {
          for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null) {
              deleteQuery = deleteQuery.eq(key, value);
            }
          }
        }
        const { data, error } = await deleteQuery.select((meta?.select as string) ?? '*');
        if (error) {
          throw new Error(`[svadmin/supabase] Delete from "${url}" failed: ${error.message}`);
        }
        return { data: data as TData };
      }
    }

    // 4. Fallback to standard HTTP fetch for absolute URLs
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    };
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: fetchHeaders,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `[svadmin/supabase] Custom request to "${url}" failed with status ${response.status}`
      );
    }

    const data = await response.json();
    return { data: data as TData };
  };

  return adapter;
}
