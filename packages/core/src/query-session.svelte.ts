import { hashKey, useQueryClient, type QueryObserverPendingResult, type QueryObserverResult, type RefetchOptions } from '@tanstack/svelte-query';
import { untrack } from 'svelte';
import { Type } from 'typebox';
import type { AdminContextAccessor } from './context.svelte';
import { captureAuthLiveScope, clearAuthQueries, handleAuthError } from './auth-hooks.svelte';
import { decodeBaseRecord } from './record-decoder';
import { HttpError } from './types';
import type { QueryKey } from './query-keys';
import { definedOptions } from './defined-options';
import type { NotificationConfig } from './hook-utils.svelte';
import { t } from './i18n.svelte';
import { notifyWithProvider } from './notification.svelte';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';

const notificationSchema = Type.Object({
  message: Type.String(), description: Type.Optional(Type.String()), key: Type.Optional(Type.String()),
  type: Type.Optional(Type.Union([Type.Literal('success'), Type.Literal('error')])),
}, { additionalProperties: false });

const queryErrorNotificationKeys = new WeakMap<object, string>();
const reportedQueryFailures = new WeakMap<object, number>();
let nextQueryErrorNotificationId = 0;

function ownData(value: unknown, key: string): unknown {
  try {
    return typeof value === 'object' && value !== null
      ? Object.getOwnPropertyDescriptor(value, key)?.value
      : undefined;
  } catch {
    return undefined;
  }
}

/** 自定义通知提供方使用的安全技术上下文。内置 toast 会把 description 拼进主文案，因此不能传给它。 */
function queryFailureDescription(resource: string, value: unknown): string {
  const status = ownData(value, 'statusCode');
  const code = ownData(value, 'code');
  return [
    resource,
    typeof code === 'string' && code.length > 0 ? code : undefined,
    typeof status === 'number' ? `HTTP ${status}` : undefined,
  ].filter((part): part is string => typeof part === 'string').join(' · ');
}

/** Expose only the normalized failure fields; provider diagnostics stay private. */
function reportQueryFailure(resource: string, value: unknown, updatedAt: number, query: object | undefined): void {
  try {
    if (query && reportedQueryFailures.get(query) === updatedAt) return;
    if (query) reportedQueryFailures.set(query, updatedAt);
    const status = ownData(value, 'statusCode');
    const code = ownData(value, 'code');
    console.error('[svadmin] Query failed', {
      resource,
      ...(typeof status === 'number' ? { status } : {}),
      ...(typeof code === 'string' ? { code } : {}),
      message: value instanceof Error ? value.message : 'Resource query failed',
    });
  } catch {
    console.error('[svadmin] Query failed', { resource });
  }
}

export interface QuerySessionOptions {
  queryKey: QueryKey;
  resource: string;
  successNotification: NotificationConfig;
  errorNotification: NotificationConfig;
  /** Extra observer lifetime constraints; must not include auth retirement during delegated logout. */
  isTargetCurrent?: () => boolean;
  /** Allow a shared query function to delegate work to another live observer. */
  allowRetiredQueryFn?: boolean;
  /** Internal domain adapter; must return a sanitized error without provider diagnostics. */
  normalizeError?: (error: unknown) => Error;
}

export function supersededQuerySession(): HttpError {
  return new HttpError('Query session is no longer current', 409, undefined, { code: 'QUERY_SESSION_SUPERSEDED' });
}

/** Retain only protocol status and known local codes, never provider diagnostics. */
export function querySessionError(error: unknown): HttpError {
  let status = 502;
  let code = 'QUERY_FAILED';
  try {
    if (typeof error === 'object' && error !== null) {
      const statusValue: unknown = Object.getOwnPropertyDescriptor(error, 'statusCode')?.value;
      const codeValue: unknown = Object.getOwnPropertyDescriptor(error, 'code')?.value;
      if (typeof statusValue === 'number' && Number.isInteger(statusValue) && statusValue >= 400 && statusValue <= 599) status = statusValue;
      if (codeValue === 'INVALID_PROVIDER_RESPONSE' || codeValue === 'INVALID_RESOURCE_INPUT' ||
        codeValue === 'DATA_PROVIDER_REQUIRED' || codeValue === 'QUERY_SESSION_SUPERSEDED' ||
        codeValue === 'SELECT_REQUEST_CANCELLED' || codeValue === 'SELECT_REQUEST_TIMEOUT' ||
        codeValue === 'INVALID_SELECT_OPTION' || codeValue === 'INVALID_COMMAND_INPUT' ||
        codeValue === 'INVALID_COMMAND_RESPONSE' || codeValue === 'INVALID_COMMAND_CONTRACT' ||
        codeValue === 'INVALID_COMMAND_METHOD' || codeValue === 'COMMAND_NOT_SUPPORTED' ||
        codeValue === 'COMMAND_FAILED' || codeValue === 'INVALID_ACCESS_CONTROL_INPUT' ||
        codeValue === 'INVALID_ACCESS_CONTROL_RESPONSE' || codeValue === 'INVALID_ACCESS_CONTROL_PROVIDER') code = codeValue;
    }
  } catch {
    // Hostile reflection is not an authentication instruction.
  }
  return new HttpError('Resource query failed', status, undefined, { code });
}

interface QueryObservation {
  isSuccess: boolean;
  isError: boolean;
  data: unknown;
  error: unknown;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
}

/** Shared ownership for ordinary, projected and paginated readers. */
export function createQuerySession<O extends QuerySessionOptions>(context: AdminContextAccessor, getOptions: () => O) {
  const client = useQueryClient();
  let disposed = false;
  const options = $derived.by(() => {
    const input = getOptions();
    const provider = context.authProvider;
    const auth = captureAuthLiveScope(provider);
    const descriptor = input.queryKey[0];
    const queryKey: QueryKey = [{
      ...descriptor, params: { ...decodeBaseRecord(descriptor.params), authSession: auth.cacheKey },
    }];
    return {
      ...input, queryKey, auth, provider, target: hashKey(input.queryKey),
      tenant: context.tenantCacheKey?.__svadminTenant,
      router: context.routerProvider, notification: context.notificationProvider,
    };
  });
  type Origin = typeof options;
  const sessionCurrent = (origin: Origin) => origin.provider === context.authProvider && origin.auth.isCurrent();
  const targetCurrent = (origin: Origin) => !disposed && origin.target === options.target &&
    origin.provider === context.authProvider && origin.tenant === context.tenantCacheKey?.__svadminTenant &&
    origin.router === context.routerProvider && (origin.isTargetCurrent === undefined || origin.isTargetCurrent() === true);
  const current = (origin: Origin) => targetCurrent(origin) && sessionCurrent(origin);
  const errorFor = (origin: Origin, error: unknown): Error =>
    origin.normalizeError ? origin.normalizeError(error) : querySessionError(error);

  function notify(origin: Origin, type: 'success' | 'error', value: unknown): void {
    try {
      const config = type === 'success' ? origin.successNotification : origin.errorNotification;
      if (config === false || !current(origin)) return;
      if (config !== undefined && typeof config !== 'function' && typeof config !== 'string') return;
      const fallback = type === 'success' ? '' : t('common.loadFailed', { message: t('common.error') });
      if (typeof config !== 'function' && !config && !fallback) return;
      const candidate = snapshotPlainData(typeof config === 'function'
        ? config(value, undefined, origin.resource)
        : {
          message: config || fallback,
          ...(type === 'error' && !config && origin.notification
            ? { description: queryFailureDescription(origin.resource, value) }
            : {}),
        });
      if (!checkExact(notificationSchema, candidate) || !current(origin) || origin.notification !== context.notificationProvider) return;
      let key = candidate.key;
      if (type === 'error' && !config) {
        const query = client.getQueryCache().find({ queryKey: origin.queryKey, exact: true });
        if (query) {
          key = queryErrorNotificationKeys.get(query);
          if (!key) {
            // 查询对象共享不透明标识，避免向通知 Provider 暴露筛选条件和请求元数据。
            key = `svadmin-query-error:${nextQueryErrorNotificationId++}`;
            queryErrorNotificationKeys.set(query, key);
          }
        }
      }
      notifyWithProvider({
        type, message: candidate.message, ...definedOptions({ description: candidate.description, key }),
      }, origin.notification);
    } catch {
      // Observer failures and malformed receipts cannot change query state.
    }
  }

  function settleDetached(origin: Origin, result: { data?: unknown; error?: unknown; success: boolean }): void {
    if (disposed) return;
    const query = client.getQueryCache().find({ queryKey: origin.queryKey, exact: true });
    if (!query || query.getObserversCount() > 0) return;
    const now = Date.now();
    if (result.success) {
      query.setState({
        data: result.data,
        dataUpdatedAt: now,
        dataUpdateCount: query.state.dataUpdateCount + 1,
        error: null,
        fetchFailureCount: 0,
        fetchFailureReason: null,
        fetchStatus: 'idle',
        status: 'success',
      });
      return;
    }
    const error = errorFor(origin, result.error);
    query.setState({
      error,
      errorUpdatedAt: now,
      errorUpdateCount: query.state.errorUpdateCount + 1,
      fetchFailureCount: query.state.fetchFailureCount + 1,
      fetchFailureReason: error,
      fetchStatus: 'idle',
      status: 'error',
    });
  }

  async function run<T>(origin: Origin, request: () => Promise<T>): Promise<T> {
    const allowRetired = origin.allowRetiredQueryFn === true;
    if ((!allowRetired && disposed) || !sessionCurrent(origin)) throw supersededQuerySession();
    try {
      const result = await request();
      if ((!allowRetired && disposed) || !sessionCurrent(origin)) {
        if (!disposed) settleDetached(origin, { success: false, error: supersededQuerySession() });
        throw supersededQuerySession();
      }
      if (!current(origin)) settleDetached(origin, { success: true, data: result });
      return result;
    } catch (error) {
      if ((!allowRetired && disposed) || !sessionCurrent(origin)) {
        if (!disposed) settleDetached(origin, { success: false, error: supersededQuerySession() });
        throw supersededQuerySession();
      }
      if (!current(origin)) settleDetached(origin, { success: false, error });
      throw errorFor(origin, error);
    }
  }

  function observe(getResult: (origin: Origin) => QueryObservation): void {
    let lastSuccess: { key: string; at: number } | undefined;
    let lastError: { key: string; at: number } | undefined;
    $effect(() => {
      const origin = options;
      const result = getResult(origin);
      const key = hashKey(origin.queryKey);
      if (!current(origin)) return;
      if (result.isSuccess && (lastSuccess?.key !== key || result.dataUpdatedAt > lastSuccess.at)) {
        lastSuccess = { key, at: result.dataUpdatedAt };
        untrack(() => notify(origin, 'success', result.data));
      } else if (result.isError && (lastError?.key !== key || result.errorUpdatedAt > lastError.at)) {
        lastError = { key, at: result.errorUpdatedAt };
        untrack(() => {
          const failure = errorFor(origin, result.error);
          const query = client.getQueryCache().find({ queryKey: origin.queryKey, exact: true });
          reportQueryFailure(origin.resource, failure, result.errorUpdatedAt, query);
          void handleAuthError(querySessionError(result.error), context, () => targetCurrent(origin),
            () => clearAuthQueries(client, origin.provider), origin.auth).catch(() => {});
          notify(origin, 'error', failure);
        });
      }
    });
  }
  // 清理微任务只读取普通快照，不访问已经销毁或退出动画中的派生状态。
  let lastQueryKey: QueryKey | undefined;
  $effect(() => { lastQueryKey = options.queryKey; });
  $effect(() => () => {
    disposed = true;
    const queryKey = lastQueryKey;
    if (!queryKey) return;
    queueMicrotask(() => {
      const query = client.getQueryCache().find({ queryKey, exact: true });
      if (query?.getObserversCount() === 0) void query.cancel();
    });
  });
  return { get options() { return options; }, client, current, sessionCurrent, run, observe, errorFor };
}

export function pendingQueryResult<T, F extends (settings?: RefetchOptions) => Promise<unknown> = QueryObserverResult<T, unknown>['refetch']>(
  refetch: F,
): Omit<QueryObserverPendingResult<T, Error>, 'refetch'> & { refetch: F } {
  return {
    data: undefined, dataUpdatedAt: 0, error: null, errorUpdatedAt: 0,
    failureCount: 0, failureReason: null, errorUpdateCount: 0,
    isError: false, isFetched: false, isFetchedAfterMount: false,
    isFetching: false, isLoading: false, isPending: true, isLoadingError: false,
    isInitialLoading: false, isPaused: false, isPlaceholderData: false,
    isRefetchError: false, isRefetching: false, isStale: true, isSuccess: false,
    isEnabled: false, status: 'pending', fetchStatus: 'idle', refetch,
  };
}

/** Delegate reflection and property access to a fully discriminated, read-only result. */
export function createQueryResultView<R extends object>(getResult: () => R): R {
  return new Proxy(getResult(), {
    get: (_target, key): unknown => Reflect.get(getResult(), key),
    has: (_target, key) => Reflect.has(getResult(), key),
    ownKeys: () => Reflect.ownKeys(getResult()),
    getOwnPropertyDescriptor: (_target, key) => Reflect.has(getResult(), key)
      ? { configurable: true, enumerable: true, get: () => Reflect.get(getResult(), key) } : undefined,
    set: () => false, defineProperty: () => false, deleteProperty: () => false,
  });
}
