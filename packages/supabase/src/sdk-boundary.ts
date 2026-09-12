import { definedOptions } from '@svadmin/core/options';
import { decodeCustomResult, rejectProviderResponse } from '@svadmin/core/schema';

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function inputObject(value: unknown, label: string): Record<string, unknown> {
  if (!isObject(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

export function inputRecord(value: unknown, label: string): Record<string, unknown> {
  const record = inputObject(value, label);
  const prototype: unknown = Object.getPrototypeOf(record);
  if (prototype !== null && prototype !== Object.prototype) throw new TypeError(`${label} must be a plain record`);
  return record;
}

function metadataValue(meta: object | undefined, key: string): unknown {
  return meta === undefined ? undefined : Reflect.get(meta, key);
}

export function optionalString(meta: object | undefined, key: string): string | undefined {
  const value = metadataValue(meta, key);
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`Supabase ${key} must be a nonempty string`);
  return value;
}

export function optionalBoolean(meta: object | undefined, key: string): boolean | undefined {
  const value = metadataValue(meta, key);
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new TypeError(`Supabase ${key} must be a boolean`);
  return value;
}

export function optionalCount(meta: object | undefined): 'exact' | 'planned' | 'estimated' | undefined {
  const value = metadataValue(meta, 'count');
  if (value === undefined || value === 'exact' || value === 'planned' || value === 'estimated') return value;
  throw new TypeError('Supabase count must be exact, planned, or estimated');
}

type SdkMethod = 'schema' | 'from' | 'rpc' | 'invoke' | 'select' | 'insert' | 'update' | 'delete' | 'eq' | 'order';

/** Dynamic SDK calls remain unknown until their response envelope is checked. */
export function callSdk(target: unknown, name: SdkMethod, args: readonly unknown[]): unknown {
  if (!isObject(target)) throw new TypeError('Invalid Supabase client or query builder');
  const method = target[name];
  if (typeof method !== 'function') throw new TypeError(`Supabase SDK method ${name} is unavailable`);
  return Reflect.apply(method, target, args);
}

export async function sdkData(request: unknown, operation: string, write: boolean): Promise<unknown> {
  const result: unknown = await request;
  if (!isObject(result) || !Object.hasOwn(result, 'error')) return rejectProviderResponse(write);
  const error = result['error'];
  if (error !== null) {
    if (!isObject(error) || typeof error['message'] !== 'string') return rejectProviderResponse(write);
    throw new Error(`[svadmin/supabase] ${operation} failed: ${error['message']}`);
  }
  return decodeCustomResult(result, write).data;
}

export async function executeSupabaseRpc(
  client: unknown, functionName: string, args: unknown, options: object,
): Promise<unknown> {
  if (typeof functionName !== 'string' || !functionName.trim()) throw new TypeError('Supabase RPC name cannot be empty');
  const schema = optionalString(options, 'schema');
  const rpcOptions = definedOptions({
    head: optionalBoolean(options, 'head'),
    get: optionalBoolean(options, 'get'),
    count: optionalCount(options),
  });
  const variables = inputRecord(args, 'Supabase RPC arguments');
  const target = schema ? callSdk(client, 'schema', [schema]) : client;
  return sdkData(callSdk(target, 'rpc', [functionName, variables, rpcOptions]),
    `RPC function "${functionName}"`, !(rpcOptions.get || rpcOptions.head));
}
