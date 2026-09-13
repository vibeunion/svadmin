import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { captureAdminContext } from './context.svelte';
import { captureQueryProvider } from './query-snapshot';
import { snapshotUpdateManyParams, parseUpdateManyParams, decodeUpdateManyReceipt, UpdateManyPartialError,
  type ContractUpdateManyParams } from './update-many-contract';
import { contractKey, parseContractRecord, type ContractSchemas, type ContractId, type ContractRecord, type ResourceContract } from './resource-contract';
import { snapshotPlainData } from './plain-data';
import { decodeBaseRecord } from './record-decoder';
import { definedOptions } from './defined-options';
import { replaceReactiveUnionMembers } from './reactive-projection';
import { invalidateOwnedQueries } from './query-invalidation';
import { createQueryResultView } from './query-session.svelte';
import { createOvertimeTracker, type OvertimeOptions } from './hook-utils.svelte';
import { getAdminOptions } from './options.svelte';
import { captureAuthLiveScope, clearAuthQueries, handleAuthError } from './auth-hooks.svelte';
import { auditWithProvider } from './audit';
import { HttpError } from './types';
import { useTranslation } from './i18n.svelte';
import { toast } from './toast.svelte';

export interface ContractUpdateManyOptions<S extends ContractSchemas> {
  resource: ResourceContract<S>;
  enabled?: boolean;
  overtimeOptions?: OvertimeOptions;
}
type Result<S extends ContractSchemas> = { data: ContractRecord<S>[] };
type Failure = HttpError | UpdateManyPartialError;
interface Callbacks<S extends ContractSchemas> {
  onSuccess?: (data: Result<S>) => void | Promise<void>;
  onError?: (error: Failure) => void | Promise<void>;
  onSettled?: (data: Result<S> | undefined, error: Failure | null) => void | Promise<void>;
}
function observe(callback: () => void | Promise<void>): void {
  try { void Promise.resolve(callback()).catch(() => {}); }
  catch { /* Observers cannot change a completed write's outcome. */ }
}
function failure(cause: unknown, dispatched = false): HttpError {
  let code: unknown;
  let status: unknown;
  try {
    if (typeof cause === 'object' && cause !== null) {
      code = Object.getOwnPropertyDescriptor(cause, 'code')?.value;
      status = Object.getOwnPropertyDescriptor(cause, 'statusCode')?.value;
    }
  } catch { /* Reflection errors remain private. */ }
  const input = code === 'INVALID_RESOURCE_INPUT' && !dispatched;
  const response = code === 'INVALID_PROVIDER_RESPONSE';
  return new HttpError(input ? 'Invalid batch update input' : response ? 'Invalid provider response' : 'Batch update failed',
    input ? 422 : response ? 502 : status === 401 || status === 403 ? status : 500, undefined, {
      code: input ? 'INVALID_RESOURCE_INPUT' : response ? 'INVALID_PROVIDER_RESPONSE' : 'UPDATE_MANY_FAILED',
      details: { writeMayHaveSucceeded: dispatched },
    });
}
function copyFailure(error: Failure): Failure {
  if (error instanceof UpdateManyPartialError) {
    return new UpdateManyPartialError(error.succeededIds, error.failedIds, error.causes.map(cause => failure(cause, true)));
  }
  return new HttpError(error.message, error.statusCode, undefined, {
    ...definedOptions({ code: error.code }), details: snapshotPlainData(error.details ?? {}),
  });
}

/** Batch updates and their progress retain the captured resource and auth revision. */
export function useContractUpdateMany<S extends ContractSchemas>(options: ContractUpdateManyOptions<S>) {
  contractKey(options.resource);
  const context = captureAdminContext();
  const client = useQueryClient();
  const adminOptions = getAdminOptions();
  const i18n = useTranslation();
  let mounted = true;
  function captureOrigin() {
    const auth = context.authProvider;
    return {
      auth, authScope: captureAuthLiveScope(auth), router: context.routerProvider,
      tenant: context.tenantCacheKey?.__svadminTenant, contract: options.resource,
    };
  }
  function originCurrent(origin: ReturnType<typeof captureOrigin>): boolean {
    try {
      return mounted && options.enabled !== false && origin.auth === context.authProvider &&
        origin.authScope.isCurrent() && origin.router === context.routerProvider &&
        origin.tenant === context.tenantCacheKey?.__svadminTenant && origin.contract === options.resource;
    } catch { return false; }
  }
  function captureScope(input: ReturnType<typeof snapshotUpdateManyParams>) {
    const origin = captureOrigin();
    const contract = origin.contract;
    const captured = captureQueryProvider(context, {
      resource: contract.name, ...definedOptions({ meta: input.meta, dataProviderName: input.dataProviderName }),
    });
    const name = context.resolveDataProviderName(contract.name, input.dataProviderName);
    const raw = context.providers?.[name];
    if (!raw) throw new HttpError('Data provider unavailable', 400);
    return {
      ...origin, ...captured, update: raw.update.bind(raw), updateMany: raw.updateMany?.bind(raw),
      matcher: { ...context.queryKeyMatcher(contract.name, input.dataProviderName), contract: contractKey(contract) },
      notification: context.notificationProvider, audit: context.auditLogProvider, live: context.liveProvider,
      key: JSON.stringify([contractKey(contract), name, captured.source, context.tenantCacheKey?.__svadminTenant, captured.meta]),
    };
  }
  function capture(params: ContractUpdateManyParams<S>) {
    const input = snapshotUpdateManyParams(params);
    const scope = captureScope(input);
    const { ids, variables } = parseUpdateManyParams(scope.contract, input);
    if (options.enabled !== undefined && typeof options.enabled !== 'boolean') {
      throw new HttpError('Invalid enabled value', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
    }
    return { ...scope, input, ids, variables, signature: JSON.stringify([scope.key, scope.authScope.cacheKey, ids, variables]) };
  }
  type Scope = ReturnType<typeof capture>;
  type Progress = { attempted: ContractId<S>[]; succeeded: ContractId<S>[]; failed: ContractId<S>[] };
  const newProgress = (): Progress => ({ attempted: [], succeeded: [], failed: [] });
  type Invocation = {
    scope: Scope | undefined; origin: ReturnType<typeof captureOrigin>;
    token: object; callbacks: Callbacks<S>; readScope(): Scope; readProgress(): Progress;
  };
  let latest = $state.raw<Scope>();
  let latestToken: object | undefined;
  let active: { scope: Scope; promise: Promise<Result<S>>; token: object; progress: Progress } | undefined;
  function targetCurrent(scope: Scope): boolean {
    if (!mounted || options.enabled === false) return false;
    try {
      return captureScope(scope.input).key === scope.key &&
        context.authProvider === scope.auth && context.routerProvider === scope.router;
    } catch { return false; }
  }
  const sessionCurrent = (scope: Scope) => {
    try { return context.authProvider === scope.auth && scope.authScope.isCurrent(); }
    catch { return false; }
  };
  const isCurrent = (scope: Scope) => targetCurrent(scope) && sessionCurrent(scope);
  function cancelled(scope: Scope | undefined, progress: Progress): HttpError {
    return new HttpError('Batch update scope changed', 409, undefined, {
      code: 'UPDATE_MANY_CANCELLED', details: {
        writeMayHaveSucceeded: progress.attempted.length > 0,
        attemptedIds: [...progress.attempted], failedIds: [...progress.failed],
        ...definedOptions({
          succeededIds: scope && sessionCurrent(scope) ? [...progress.succeeded] : undefined,
          unattemptedIds: scope?.ids.filter(id => !progress.attempted.includes(id)),
        }),
      },
    });
  }
  function copyResult(scope: Scope, data: Result<S>): Result<S> {
    return { data: data.data.map(record => parseContractRecord(scope.contract, record)) };
  }
  function notify(scope: Scope, current: () => boolean, type: 'success' | 'error', message: string): void {
    observe(() => {
      if (!current()) return;
      if (scope.notification) return scope.notification.open({ type, message });
      if (type === 'success') toast.success(message);
      else toast.error(message);
    });
  }
  async function refresh(scope: Scope, attempted: readonly (string | number)[]) {
    if (!attempted.length) return;
    const owner = {
      client, matcher: { ...scope.matcher, resource: scope.contract.name },
      owner: { source: scope.source, authSession: scope.authScope.cacheKey },
      current: () => sessionCurrent(scope),
    };
    // Every started refresh settles even if a sibling fails or changes authentication.
    await Promise.allSettled([
      invalidateOwnedQueries({ ...owner, scopes: ['list', 'many'] }),
      ...attempted.map(id => invalidateOwnedQueries({ ...owner, scopes: ['detail'], id })),
    ]);
  }
  const mutation = createMutation<Result<S>, Failure, Invocation>(() => ({
    retry: false, onMutate: () => undefined, onSuccess: () => {}, onError: () => {}, onSettled: () => {},
    mutationFn: async invocation => {
      let scope: Scope;
      try { scope = invocation.readScope(); }
      catch (cause) {
        const error = failure(cause);
        const current = () => latestToken === invocation.token && originCurrent(invocation.origin);
        if (!current()) throw cancelled(undefined, invocation.readProgress());
        observe(() => { if (current()) return invocation.callbacks.onError?.(copyFailure(error)); });
        observe(() => { if (current()) return invocation.callbacks.onSettled?.(undefined, copyFailure(error)); });
        throw error;
      }
      const progress = invocation.readProgress();
      const { attempted, succeeded, failed } = progress;
      const causes: HttpError[] = [];
      const data: ContractRecord<S>[] = [];
      let rejected: Failure | undefined;
      const current = () => isCurrent(scope) && latestToken === invocation.token;
      const ensureCurrent = () => {
        if (!current() || active?.token !== invocation.token) throw cancelled(scope, progress);
      };
      const request = () => ({
        resource: scope.contract.name, variables: snapshotPlainData(scope.variables),
        ...definedOptions({ meta: scope.meta === undefined ? undefined : decodeBaseRecord(snapshotPlainData(scope.meta)) }),
      });
      try {
        ensureCurrent();
        if (scope.updateMany) {
          const params = { ...request(), ids: [...scope.ids] };
          attempted.push(...scope.ids);
          const response = await scope.updateMany(params);
          if (!sessionCurrent(scope)) throw cancelled(scope, progress);
          data.push(...decodeUpdateManyReceipt(scope.contract, scope.ids, response, true));
          succeeded.push(...scope.ids);
        } else {
          for (const id of scope.ids) {
            ensureCurrent();
            const params = { ...request(), id };
            attempted.push(id);
            try {
              const response = await scope.update(params);
              if (!sessionCurrent(scope)) throw cancelled(scope, progress);
              data.push(...decodeUpdateManyReceipt(scope.contract, [id], response, false));
              succeeded.push(id);
            } catch (cause) {
              if (!sessionCurrent(scope)) throw cancelled(scope, progress);
              failed.push(id);
              causes.push(failure(cause, true));
            }
          }
          if (failed.length) rejected = succeeded.length
            ? new UpdateManyPartialError(succeeded, failed, causes) : causes[0] ?? failure(undefined, true);
        }
      } catch (cause) {
        rejected = failure(cause, attempted.length > 0);
      } finally {
        for (const id of succeeded) {
          if (!sessionCurrent(scope)) break;
          auditWithProvider({ action: 'update', resource: scope.contract.name, recordId: id,
            ...definedOptions({ meta: scope.meta }) }, scope.audit, () => sessionCurrent(scope));
        }
        if (succeeded.length) observe(() => {
          if (sessionCurrent(scope)) return scope.live?.publish?.({
            type: 'UPDATE', resource: scope.contract.name, payload: { ids: [...succeeded] },
          });
        });
        if (sessionCurrent(scope)) await refresh(scope, attempted);
      }
      ensureCurrent();
      if (rejected) {
        const error = rejected;
        const authError = causes.find(cause => cause.statusCode === 401 || cause.statusCode === 403) ?? error;
        observe(async () => {
          await handleAuthError(failure(authError, true), context,
            () => targetCurrent(scope) && latestToken === invocation.token,
            () => clearAuthQueries(client, scope.auth), scope.authScope,
            () => mounted && latestToken !== invocation.token);
        });
        notify(scope, current, 'error', i18n.t('common.operationFailed'));
        observe(() => { if (current()) return invocation.callbacks.onError?.(copyFailure(error)); });
        observe(() => { if (current()) return invocation.callbacks.onSettled?.(undefined, copyFailure(error)); });
        throw error;
      }
      const result = { data };
      notify(scope, current, 'success', i18n.t('common.updateSuccess'));
      observe(() => { if (current()) return invocation.callbacks.onSuccess?.(copyResult(scope, result)); });
      observe(() => { if (current()) return invocation.callbacks.onSettled?.(copyResult(scope, result), null); });
      ensureCurrent();
      return copyResult(scope, result);
    },
  }));
  $effect.pre(() => {
    if (latest && !isCurrent(latest)) {
      latest = undefined;
      active = undefined;
      mutation.reset();
    }
  });
  $effect(() => () => { mounted = false; active = undefined; latestToken = undefined; });

  function detachedPromise(promise: Promise<Result<S>>, scope: Scope, token: object, progress: Progress): Promise<Result<S>> {
    return promise.then(data => {
      if (!isCurrent(scope) || latestToken !== token) throw cancelled(scope, progress);
      return copyResult(scope, data);
    }, (cause: unknown) => {
      if (!isCurrent(scope) || latestToken !== token) throw cancelled(scope, progress);
      throw cause instanceof HttpError ? copyFailure(cause) : failure(cause, progress.attempted.length > 0);
    });
  }
  function mutateAsync(params: ContractUpdateManyParams<S>, callbacks: Callbacks<S> = {}): Promise<Result<S>> {
    const origin = captureOrigin();
    const observer = { onSuccess: callbacks.onSuccess, onError: callbacks.onError, onSettled: callbacks.onSettled };
    let scope: Scope;
    try { scope = capture(params); }
    catch (cause) {
      const error = failure(cause);
      if (active && isCurrent(active.scope)) return Promise.reject(error);
      latest = undefined;
      active = undefined;
      const token = {};
      const progress = newProgress();
      latestToken = token;
      return mutation.mutateAsync(Object.freeze({
        scope: undefined, origin, token, callbacks: definedOptions(observer), readScope: () => { throw error; },
        readProgress: () => progress,
      })).catch((cause: unknown) => {
        if (!originCurrent(origin) || latestToken !== token) throw cancelled(undefined, progress);
        throw cause instanceof HttpError ? copyFailure(cause) : failure(cause);
      });
    }
    if (active && isCurrent(active.scope)) {
      if (active.scope.signature === scope.signature) {
        const owner = active.scope;
        const { token, progress } = active;
        const current = () => isCurrent(owner) && latestToken === token;
        return detachedPromise(active.promise, owner, token, progress).then(data => {
          if (current()) {
            observe(() => observer.onSuccess?.(copyResult(owner, data)));
            observe(() => { if (current()) return observer.onSettled?.(copyResult(owner, data), null); });
          }
          if (!current()) throw cancelled(owner, progress);
          return data;
        }, (cause: unknown) => {
          const error = cause instanceof HttpError ? cause : failure(cause, progress.attempted.length > 0);
          if (current()) {
            observe(() => observer.onError?.(copyFailure(error)));
            observe(() => { if (current()) return observer.onSettled?.(undefined, copyFailure(error)); });
          }
          if (!current()) throw cancelled(owner, progress);
          throw error;
        });
      }
      return Promise.reject(new HttpError('Batch update is already running', 409, undefined, { code: 'UPDATE_MANY_BUSY' }));
    }
    const token = {};
    latestToken = token;
    latest = scope;
    const target = scope;
    const progress = newProgress();
    // Preserve scope and token identity through Svelte's mutation-state projection.
    const promise = mutation.mutateAsync(Object.freeze({
      scope, origin, token, callbacks: definedOptions(observer), readScope: () => target,
      readProgress: () => progress,
    })).finally(() => { if (active?.token === token) active = undefined; });
    active = { scope, token, promise, progress };
    return detachedPromise(promise, target, token, progress);
  }
  // Copy reads while retaining TanStack's success/error discriminated union.
  function detachedState(state: typeof mutation): typeof mutation;
  function detachedState(state: typeof mutation): object {
    return replaceReactiveUnionMembers(state, {
      get data() {
        const scope = state.variables?.scope;
        return state.data && scope ? copyResult(scope, state.data) : undefined;
      },
      get error() { return state.error ? copyFailure(state.error) : null; },
      get failureReason() { return state.failureReason ? copyFailure(state.failureReason) : null; },
    });
  }
  const result = replaceReactiveUnionMembers(detachedState(mutation), {
    get variables() {
      const scope = mutation.variables?.scope;
      return scope ? parseUpdateManyParams(scope.contract, scope.input) : undefined;
    },
    mutateAsync,
    mutate(params: ContractUpdateManyParams<S>, callbacks?: Callbacks<S>): void {
      void mutateAsync(params, callbacks).catch(() => {});
    },
    reset() { active = undefined; latest = undefined; latestToken = undefined; mutation.reset(); },
  });
  const idle: typeof result = {
    context: undefined, data: undefined, error: null, failureCount: 0, failureReason: null,
    isError: false, isIdle: true, isPending: false, isPaused: false, isSuccess: false,
    status: 'idle', submittedAt: 0, variables: undefined,
    mutate: result.mutate, mutateAsync: result.mutateAsync, reset: result.reset,
  };
  const view = createQueryResultView(() => {
    const invocation = mutation.variables;
    if (!mounted || (invocation && (!originCurrent(invocation.origin) || latestToken !== invocation.token ||
      (invocation.scope && !isCurrent(invocation.scope))))) return idle;
    return result;
  });
  const overtime = createOvertimeTracker(() => view.isPending, options.overtimeOptions ?? adminOptions.overtime);
  return { mutation: view, get overtime() { return overtime; } };
}
