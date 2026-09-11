import { executeSupabaseRpc, inputObject } from './sdk-boundary';

export interface SupabaseRpcOptions {
  /** Database schema where the RPC function resides (defaults to client schema or 'public') */
  schema?: string;
  /** Use HEAD and omit result rows. */
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
  call: (
    functionName: string,
    args?: Record<string, unknown>,
    options?: SupabaseRpcOptions
  ) => Promise<unknown>;
}

/**
 * Creates a dedicated Supabase RPC helper for executing PostgreSQL stored procedures.
 *
 * @param client SupabaseClient instance
 * @param defaultOptions Default options applied to all RPC calls
 */
export function createSupabaseRpc(
  client: unknown,
  defaultOptions: SupabaseRpcOptions = {}
): SupabaseRpcClient {
  inputObject(client, 'Supabase client');
  return {
    async call(
      functionName: string,
      args?: Record<string, unknown>,
      options: SupabaseRpcOptions = {}
    ): Promise<unknown> {
      const mergedOptions = { ...defaultOptions, ...options };
      return executeSupabaseRpc(client, functionName, args === undefined ? {} : args, mergedOptions);
    },
  };
}
