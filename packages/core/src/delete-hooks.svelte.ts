import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { captureAdminContext } from './context.svelte';
import { captureQueryProvider } from './query-snapshot';
import { snapshotDeleteParams, parseDeleteParams, decodeDeleteReceipt, type ContractDeleteParams } from './delete-contract';
import { contractKey, parseContractRecord, parseContractId,
  type ContractSchemas, type ContractId, type ContractRecord, type ResourceContract } from './resource-contract';
import { snapshotPlainData } from './plain-data';
import { decodeBaseRecord } from './record-decoder';
import { definedOptions } from './defined-options';
import { replaceReactiveUnionMembers } from './reactive-projection';
import { invalidateOwnedQueries, readOwnedDataQuery } from './query-invalidation';
import { createQueryResultView } from './query-session.svelte';
import { createOvertimeTracker, type OvertimeOptions } from './hook-utils.svelte';
import { getAdminOptions } from './options.svelte';
import { captureAuthLiveScope, clearAuthQueries, handleAuthError } from './auth-hooks.svelte';
import { auditWithProvider } from './audit';
import { HttpError, UndoError } from './types';
import { useTranslation } from './i18n.svelte';
import { toast, getToasts, removeToast } from './toast.svelte';

export type { ContractDeleteParams } from './delete-contract';
export interface ContractDeleteOptions<S extends ContractSchemas> {
  resource: ResourceContract<S>;
  id: NoInfer<ContractId<S>>;
  enabled?: boolean;
  undoable?: boolean;
  undoableTimeout?: number;
  overtimeOptions?: OvertimeOptions;
}
type Result<S extends ContractSchemas> = { data: ContractRecord<S> };
type Failure = HttpError | UndoError;
interface Callbacks<S extends ContractSchemas> {
  onSuccess?: (data: Result<S>, params: ContractDeleteParams<S>) => void | Promise<void>;
  onError?: (error: Failure, params: ContractDeleteParams<S> | undefined) => void | Promise<void>;
  onSettled?: (data: Result<S> | undefined, error: Failure | null, params: ContractDeleteParams<S> | undefined) => void | Promise<void>;
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
  const provider = code === 'DATA_PROVIDER_REQUIRED' && !dispatched;
  const response = code === 'INVALID_PROVIDER_RESPONSE';
  return new HttpError(input ? 'Invalid deletion input' : provider ? 'Data provider unavailable'
    : response ? 'Invalid provider response' : 'Delete failed',
  input ? 422 : provider ? 400 : response ? 502 : status === 401 || status === 403 ? status : 500, undefined, {
    code: input ? 'INVALID_RESOURCE_INPUT' : provider ? 'DATA_PROVIDER_REQUIRED'
      : response ? 'INVALID_PROVIDER_RESPONSE' : 'DELETE_FAILED',
    details: { phase: dispatched ? 'response' : 'input', writeMayHaveSucceeded: dispatched },
  });
}
function copyFailure(error: Failure): Failure {
  if (!(error instanceof HttpError)) return new UndoError();
  return new HttpError(error.message, error.statusCode, undefined, {
    ...definedOptions({ code: error.code }), details: snapshotPlainData(error.details ?? {}),
  });
}

/** Undo windows and deletions retain their checked identity and originating auth revision. */
export function useContractDelete<S extends ContractSchemas>(options: ContractDeleteOptions<S>) {
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
      tenant: context.tenantCacheKey?.__svadminTenant, contract: options.resource, id: options.id,
    };
  }
  function originCurrent(origin: ReturnType<typeof captureOrigin>): boolean {
    try {
      return mounted && options.enabled !== false && origin.auth === context.authProvider &&
        origin.authScope.isCurrent() && origin.router === context.routerProvider &&
        origin.tenant === context.tenantCacheKey?.__svadminTenant && origin.contract === options.resource &&
        Object.is(origin.id, options.id);
    } catch { return false; }
  }
  function captureScope(input: ReturnType<typeof snapshotDeleteParams>) {
    const origin = captureOrigin();
    const contract = origin.contract;
    const id = parseContractId(contract, origin.id);
    const undoable = options.undoable ?? false;
    const timeout = options.undoableTimeout ?? adminOptions.undoableTimeout ?? 5000;
    if ((options.enabled !== undefined && typeof options.enabled !== 'boolean') ||
        typeof undoable !== 'boolean' || !Number.isSafeInteger(timeout) || timeout < 0 || timeout > 2_147_483_647) {
      throw new HttpError('Invalid deletion policy', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
    }
    const captured = captureQueryProvider(context, {
      resource: contract.name, ...definedOptions({ meta: input.meta, dataProviderName: input.dataProviderName }),
    });
    const name = context.resolveDataProviderName(contract.name, input.dataProviderName);
    const raw = context.providers?.[name];
    if (!raw) throw new HttpError('Data provider unavailable', 400, undefined, { code: 'DATA_PROVIDER_REQUIRED' });
    return {
      ...origin, id, undoable, timeout, ...captured, deleteOne: raw.deleteOne.bind(raw),
      matcher: { ...context.queryKeyMatcher(contract.name, input.dataProviderName), contract: contractKey(contract) },
      notification: context.notificationProvider, audit: context.auditLogProvider, live: context.liveProvider,
      key: JSON.stringify([contractKey(contract), id, name, captured.source, context.tenantCacheKey?.__svadminTenant, captured.meta, undoable, timeout]),
    };
  }
  function capture(params: ContractDeleteParams<S>) {
    const input = snapshotDeleteParams(params);
    const scope = captureScope(input);
    const { variables } = parseDeleteParams(scope.contract, input);
    return { ...scope, input, variables, signature: JSON.stringify([scope.key, scope.authScope.cacheKey, variables]) };
  }
  type Scope = ReturnType<typeof capture>;
  type Invocation = {
    scope: Scope | undefined; origin: ReturnType<typeof captureOrigin>;
    token: object; callbacks: Callbacks<S>; readScope(): Scope; markDispatched(): void;
  };
  let latest = $state.raw<Scope>();
  let latestToken: object | undefined;
  let active: { scope: Scope; promise: Promise<Result<S>>; token: object; wasDispatched(): boolean } | undefined;
  let waiter: { token: object; cancel(): void } | undefined;
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
  function cancelled(scope: Scope | undefined, dispatched: boolean, result?: Result<S>): HttpError {
    return new HttpError('Delete scope changed', 409, undefined, {
      code: 'DELETE_CANCELLED', details: {
        writeMayHaveSucceeded: dispatched,
        ...definedOptions({
          id: scope?.id,
          deleted: scope && sessionCurrent(scope) && result ? snapshotPlainData(result.data) : undefined,
        }),
      },
    });
  }
  function waitForUndo(scope: Scope, token: object): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let toastId: number | undefined;
      const finish = (error?: Failure) => {
        if (settled) return;
        settled = true;
        if (toastId !== undefined) removeToast(toastId);
        if (waiter?.token === token) waiter = undefined;
        if (error) reject(error);
        else resolve();
      };
      const onUndo = () => finish(new UndoError());
      const onTimeout = () => finish();
      toast.undoable('Action can be undone', scope.timeout, onUndo, onTimeout);
      toastId = getToasts().find(item => item.onUndo === onUndo && item.onTimeout === onTimeout)?.id;
      if (toastId === undefined) {
        finish(new HttpError('Undo window unavailable', 500));
        return;
      }
      waiter = { token, cancel: () => finish(cancelled(scope, false)) };
    });
  }
  function copyResult(scope: Scope, result: Result<S>): Result<S> {
    return { data: parseContractRecord(scope.contract, result.data) };
  }
  function copyParams(scope: Scope): ContractDeleteParams<S> {
    return parseDeleteParams(scope.contract, scope.input);
  }
  function notify(scope: Scope, current: () => boolean, type: 'success' | 'error', message: string): void {
    observe(() => {
      if (!current()) return;
      if (scope.notification) return scope.notification.open({ type, message });
      if (type === 'success') toast.success(message);
      else toast.error(message);
    });
  }
  async function refresh(scope: Scope, confirmed: boolean) {
    const matcher = { ...scope.matcher, resource: scope.contract.name };
    const owner = { source: scope.source, authSession: scope.authScope.cacheKey };
    try {
      if (confirmed) {
        const detailMatches = (key: readonly unknown[]) => {
          if (!sessionCurrent(scope)) return false;
          const descriptor = readOwnedDataQuery(key, matcher, owner);
          return descriptor?.action === 'one' && descriptor.id === scope.id;
        };
        const queries = client.getQueryCache().findAll({ predicate: query => detailMatches(query.queryKey) });
        // Cache removal callbacks may change session before the next detail is removed.
        for (const query of queries) {
          if (!sessionCurrent(scope)) return;
          client.removeQueries({ predicate: candidate => candidate === query && detailMatches(candidate.queryKey) });
        }
      }
      await invalidateOwnedQueries({
        client, matcher, owner, scopes: ['list', 'many', 'detail'], id: scope.id,
        current: () => sessionCurrent(scope),
      });
    } catch {
      // Cache failure cannot falsify a deletion receipt; currentness is checked after settlement.
    }
  }
  const mutation = createMutation<Result<S>, Failure, Invocation>(() => ({
    retry: false, onMutate: () => undefined, onSuccess: () => {}, onError: () => {}, onSettled: () => {},
    mutationFn: async invocation => {
      let scope: Scope;
      try { scope = invocation.readScope(); }
      catch (cause) {
        const error = failure(cause);
        const current = () => latestToken === invocation.token && originCurrent(invocation.origin);
        if (!current()) throw cancelled(undefined, false);
        observe(() => { if (current()) return invocation.callbacks.onError?.(copyFailure(error), undefined); });
        observe(() => { if (current()) return invocation.callbacks.onSettled?.(undefined, copyFailure(error), undefined); });
        throw error;
      }
      let dispatched = false;
      let result: Result<S> | undefined;
      let rejected: Failure | undefined;
      const current = () => isCurrent(scope) && latestToken === invocation.token;
      const ensureCurrent = () => {
        if (!current() || active?.token !== invocation.token) throw cancelled(scope, dispatched, result);
      };
      try {
        ensureCurrent();
        if (scope.undoable) await waitForUndo(scope, invocation.token);
        ensureCurrent();
        const request = {
          resource: scope.contract.name, id: scope.id,
          ...definedOptions({
            variables: scope.variables === undefined ? undefined : snapshotPlainData(scope.variables),
            meta: scope.meta === undefined ? undefined : decodeBaseRecord(snapshotPlainData(scope.meta)),
          }),
        };
        dispatched = true;
        invocation.markDispatched();
        const response = await scope.deleteOne(request);
        if (!sessionCurrent(scope)) throw cancelled(scope, dispatched);
        result = decodeDeleteReceipt(scope.contract, scope.id, response);
      } catch (cause) {
        rejected = cause instanceof UndoError && !dispatched ? new UndoError() : failure(cause, dispatched);
      } finally {
        if (result && sessionCurrent(scope)) {
          auditWithProvider({ action: 'delete', resource: scope.contract.name, recordId: scope.id,
            ...definedOptions({ meta: scope.meta }) }, scope.audit, () => sessionCurrent(scope));
          observe(() => {
            if (sessionCurrent(scope)) return scope.live?.publish?.({ type: 'DELETE', resource: scope.contract.name, payload: { ids: [scope.id] } });
          });
        }
        if (dispatched && sessionCurrent(scope)) await refresh(scope, result !== undefined);
      }
      ensureCurrent();
      if (rejected || !result) {
        const error = rejected ?? failure(undefined, dispatched);
        if (error instanceof HttpError) {
          observe(async () => {
            await handleAuthError(copyFailure(error), context,
              () => targetCurrent(scope) && latestToken === invocation.token,
              () => clearAuthQueries(client, scope.auth), scope.authScope);
          });
          notify(scope, current, 'error', i18n.t('common.operationFailed'));
        }
        observe(() => { if (current()) return invocation.callbacks.onError?.(copyFailure(error), copyParams(scope)); });
        observe(() => { if (current()) return invocation.callbacks.onSettled?.(undefined, copyFailure(error), copyParams(scope)); });
        throw error;
      }
      const completed = result;
      notify(scope, current, 'success', i18n.t('common.deleteSuccess'));
      observe(() => { if (current()) return invocation.callbacks.onSuccess?.(copyResult(scope, completed), copyParams(scope)); });
      observe(() => { if (current()) return invocation.callbacks.onSettled?.(copyResult(scope, completed), null, copyParams(scope)); });
      ensureCurrent();
      return copyResult(scope, completed);
    },
  }));
  function clearActive() {
    waiter?.cancel();
    waiter = undefined;
    latest = undefined;
    active = undefined;
  }
  $effect.pre(() => {
    if (latest && !isCurrent(latest)) { clearActive(); mutation.reset(); }
  });
  $effect(() => () => { mounted = false; latestToken = undefined; clearActive(); });

  function detachedPromise(promise: Promise<Result<S>>, scope: Scope, token: object, wasDispatched: () => boolean): Promise<Result<S>> {
    return promise.then(data => {
      if (!isCurrent(scope) || latestToken !== token) throw cancelled(scope, wasDispatched(), data);
      return copyResult(scope, data);
    }, (cause: unknown) => {
      if (!sessionCurrent(scope)) throw cancelled(scope, wasDispatched());
      throw cause instanceof HttpError || cause instanceof UndoError ? copyFailure(cause) : failure(cause, wasDispatched());
    });
  }
  function mutateAsync(params: ContractDeleteParams<S>, callbacks: Callbacks<S> = {}): Promise<Result<S>> {
    const origin = captureOrigin();
    const observer = { onSuccess: callbacks.onSuccess, onError: callbacks.onError, onSettled: callbacks.onSettled };
    let scope: Scope;
    try { scope = capture(params); }
    catch (cause) {
      const error = failure(cause);
      if (active && isCurrent(active.scope)) return Promise.reject(error);
      clearActive();
      const token = {};
      latestToken = token;
      return mutation.mutateAsync(Object.freeze({
        scope: undefined, origin, token, callbacks: definedOptions(observer), readScope: () => { throw error; },
        markDispatched: () => {},
      })).catch((cause: unknown) => {
        if (!originCurrent(origin) || latestToken !== token) throw cancelled(undefined, false);
        throw cause instanceof HttpError ? copyFailure(cause) : failure(cause);
      });
    }
    if (active && isCurrent(active.scope)) {
      if (active.scope.signature === scope.signature) {
        const owner = active.scope;
        const token = active.token;
        return detachedPromise(active.promise, owner, token, active.wasDispatched).then(data => {
          if (isCurrent(owner) && latest === owner) {
            observe(() => observer.onSuccess?.(copyResult(owner, data), copyParams(owner)));
            observe(() => {
              if (isCurrent(owner) && latestToken === token) return observer.onSettled?.(copyResult(owner, data), null, copyParams(owner));
            });
          }
          if (!isCurrent(owner) || latestToken !== token) throw cancelled(owner, true, data);
          return data;
        }, (cause: unknown) => {
          const error = cause instanceof HttpError || cause instanceof UndoError ? cause : failure(cause, true);
          if (isCurrent(owner) && latest === owner) {
            observe(() => observer.onError?.(copyFailure(error), copyParams(owner)));
            observe(() => {
              if (isCurrent(owner) && latestToken === token) return observer.onSettled?.(undefined, copyFailure(error), copyParams(owner));
            });
          }
          throw error;
        });
      }
      return Promise.reject(new HttpError('Delete is already running', 409, undefined, { code: 'DELETE_BUSY' }));
    }
    clearActive();
    const token = {};
    latestToken = token;
    latest = scope;
    const target = scope;
    let dispatched = false;
    const wasDispatched = () => dispatched;
    // Keep scope and token identities intact through Svelte's mutation-state projection.
    const promise = mutation.mutateAsync(Object.freeze({
      scope, origin, token, callbacks: definedOptions(observer), readScope: () => target,
      markDispatched: () => { dispatched = true; },
    })).finally(() => { if (active?.token === token) active = undefined; });
    active = { scope, token, promise, wasDispatched };
    return detachedPromise(promise, target, token, wasDispatched);
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
      return scope ? copyParams(scope) : undefined;
    },
    mutateAsync,
    mutate(params: ContractDeleteParams<S>, callbacks?: Callbacks<S>): void {
      void mutateAsync(params, callbacks).catch(() => {});
    },
    reset() { latestToken = undefined; clearActive(); mutation.reset(); },
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
