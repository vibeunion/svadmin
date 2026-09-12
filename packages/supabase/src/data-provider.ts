import { definedOptions } from '@svadmin/core/options';
import { decodeCustomResult, rejectProviderResponse, type DataTransport } from '@svadmin/core/schema';
import type { DataProvider, Filter } from '@svadmin/core';
import { createRefineAdapter } from '@svadmin/refine-adapter';
import { isObject, inputObject, inputRecord, optionalString, optionalBoolean, optionalCount, callSdk, sdkData, executeSupabaseRpc } from './sdk-boundary';
// Static import keeps the provider available in bundled SPA builds.
import { dataProvider as refineDataProvider } from '@refinedev/supabase';

export interface CreateSupabaseDataProviderOptions {
  /** Default schema for table and RPC operations. */
  schema?: string;
}

function edgeBody(value: unknown): unknown {
  if (value === undefined || typeof value === 'string') return value;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return value;
  if (value instanceof ArrayBuffer) return value;
  if (typeof FormData !== 'undefined' && value instanceof FormData) return value;
  return inputRecord(value, 'Supabase Edge Function body');
}

function applyEqualityQuery(builder: unknown, query: Record<string, unknown> | undefined): unknown {
  let result = builder;
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) result = callSdk(result, 'eq', [key, value]);
  }
  return result;
}

function validateFilters(filters: readonly Filter[] | undefined): void {
  for (const filter of filters ?? []) {
    if (!('field' in filter) || filter.operator !== 'eq') {
      throw new TypeError('Supabase custom table requests support only equality filters');
    }
    if (filter.value === null || filter.value === undefined) throw new TypeError('Supabase equality filters require a non-null value');
  }
}

function applyFilters(builder: unknown, filters: readonly Filter[] | undefined): unknown {
  let result = builder;
  for (const filter of filters ?? []) {
    if ('field' in filter) result = callSdk(result, 'eq', [filter.field, filter.value]);
  }
  return result;
}

async function parseHttpResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205 || response.headers.get('content-length')?.trim() === '0') return undefined;
  const body = await response.text();
  return body.trim() ? JSON.parse(body) : undefined;
}

/**
 * Adapts a Supabase SDK instance without assuming its dynamic response types.
 * Resource/command contracts provide the business schema above this transport.
 */
export function createSupabaseDataProvider(
  client: unknown,
  options: CreateSupabaseDataProviderOptions = {},
): DataProvider {
  inputObject(client, 'Supabase client');
  const defaultSchema = optionalString(options, 'schema');
  if (typeof refineDataProvider !== 'function') throw new Error('[svadmin/supabase] Missing @refinedev/supabase data provider');
  const adapter = createRefineAdapter(refineDataProvider(client));

  const executeCustom: NonNullable<DataTransport['custom']> = async ({
    url, method, payload, query, headers, filters, sorters, meta,
  }) => {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) throw new TypeError('Unsupported Supabase request method');
    const targetSchema = optionalString(meta, 'schema') ?? defaultSchema;
    const select = optionalString(meta, 'select') ?? '*';
    const rpc = optionalBoolean(meta, 'rpc');
    const edge = optionalBoolean(meta, 'function');
    const edgeFunction = optionalBoolean(meta, 'edgeFunction');
    const rpcOptions = definedOptions({
      head: optionalBoolean(meta, 'head'), get: optionalBoolean(meta, 'get') ?? method === 'get', count: optionalCount(meta),
    });
    const write = method !== 'get';

    if (edge || edgeFunction || url.startsWith('functions/') || url.startsWith('functions:')) {
      const functionName = url.replace(/^functions[/:]/, '');
      if (!functionName.trim()) throw new TypeError('Supabase function name cannot be empty');
      const source = inputObject(client, 'Supabase client');
      const body = edgeBody(payload);
      if (method === 'get' && body !== undefined) throw new TypeError('A GET function request cannot have a body');
      const invocation = callSdk(source['functions'], 'invoke', [functionName, definedOptions({
        body,
        headers,
        method: method.toUpperCase(),
      })]);
      return { data: await sdkData(invocation, `Edge Function "${functionName}"`, write) };
    }

    if (rpc === true || url.startsWith('rpc/') || url.startsWith('rpc:')) {
      const functionName = url.replace(/^rpc[/:]/, '');
      if (!functionName.trim()) throw new TypeError('Supabase RPC name cannot be empty');
      const args = payload === undefined ? query ?? {} : payload;
      return { data: await executeSupabaseRpc(client, functionName, args, definedOptions({ schema: targetSchema, ...rpcOptions })) };
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      validateFilters(filters);
      if (Object.values(query ?? {}).some(value => value === null)) {
        throw new TypeError('Supabase equality queries require non-null values');
      }
      const variables = method === 'post' || method === 'put' || method === 'patch'
        ? inputRecord(payload, 'Supabase table variables') : undefined;
      const target = targetSchema ? callSdk(client, 'schema', [targetSchema]) : client;
      const table = callSdk(target, 'from', [url]);
      let builder: unknown;
      if (method === 'get') builder = callSdk(table, 'select', [select]);
      else if (method === 'post') builder = callSdk(table, 'insert', [variables]);
      else if (method === 'put' || method === 'patch') builder = callSdk(table, 'update', [variables]);
      else builder = callSdk(table, 'delete', []);
      builder = applyFilters(applyEqualityQuery(builder, query), filters);
      if (method === 'get') {
        for (const sorter of sorters ?? []) builder = callSdk(builder, 'order', [sorter.field, { ascending: sorter.order === 'asc' }]);
      } else {
        builder = callSdk(builder, 'select', [select]);
      }
      const data = await sdkData(builder, `Table request "${url}"`, write);
      if (method === 'post' || method === 'put' || method === 'patch') {
        if (!Array.isArray(data) || data.length !== 1 || !isObject(data[0])) return rejectProviderResponse(write);
        return { data: data[0] };
      }
      if (!Array.isArray(data) || !data.every(isObject)) return rejectProviderResponse(write);
      return { data };
    }

    const response = await fetch(url, definedOptions({
      method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json', ...headers },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }));
    if (!response.ok) throw new Error(`[svadmin/supabase] Custom request failed with status ${response.status}`);
    return { data: await parseHttpResponse(response) };
  };

  adapter.custom = async params => decodeCustomResult(await executeCustom(params), params.method !== 'get');
  return adapter;
}
