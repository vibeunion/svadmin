// Supabase RPC Helper — Type-safe and Ergonomic PostgreSQL Function Execution
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseRpcOptions {
  /** Database schema where the RPC function resides (defaults to client schema or 'public') */
  schema?: string;
  /** When true, do not return result rows (sets Prefer: return=minimal) */
  head?: boolean;
  /** Count algorithm to use */
  count?: 'exact' | 'planned' | 'estimated';
  /** Use GET HTTP method for read-only RPCs (enables HTTP caching) */
  get?: boolean;
}

export interface SupabaseRpcClient {
  /**
   * Invoke a Postgres stored procedure / function via Supabase RPC.
   *
   * @param functionName Name of the PostgreSQL stored procedure
   * @param args Arguments to pass to the procedure
   * @param options Additional Supabase RPC options (schema, head, count, get)
   * @returns The returned data from the RPC call
   */
  call: <TResult = unknown, TArgs extends Record<string, unknown> = Record<string, unknown>>(
    functionName: string,
    args?: TArgs,
    options?: SupabaseRpcOptions
  ) => Promise<TResult>;
}

/**
 * Creates a dedicated Supabase RPC helper for executing PostgreSQL stored procedures.
 *
 * @param client SupabaseClient instance
 * @param defaultOptions Default options applied to all RPC calls
 */
export function createSupabaseRpc(
  client: SupabaseClient,
  defaultOptions: SupabaseRpcOptions = {}
): SupabaseRpcClient {
  return {
    async call<TResult = unknown, TArgs extends Record<string, unknown> = Record<string, unknown>>(
      functionName: string,
      args?: TArgs,
      options: SupabaseRpcOptions = {}
    ): Promise<TResult> {
      const mergedOptions = { ...defaultOptions, ...options };
      const targetClient = mergedOptions.schema ? client.schema(mergedOptions.schema) : client;

      const { data, error } = await targetClient.rpc(
        functionName,
        args ?? ({} as TArgs),
        {
          head: mergedOptions.head,
          count: mergedOptions.count,
          get: mergedOptions.get,
        }
      );

      if (error) {
        throw new Error(
          `[svadmin/supabase] RPC function "${functionName}" failed: ${error.message}`
        );
      }

      return data as TResult;
    },
  };
}
