import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { captureAdminContext } from './context.svelte';
import { captureQueryProvider } from './query-snapshot';
import { snapshotCreateParams, parseCreateParams, decodeCreateReceipt, createInputId,
  type ContractCreateParams } from './create-contract';
import { contractKey, parseContractRecord, parseContractId,
  type ContractSchemas, type ContractRecord, type ResourceContract } from './resource-contract';
import { snapshotPlainData } from './plain-data';
import { decodeBaseRecord } from './record-decoder';
import { definedOptions } from './defined-options';
import { replaceReactiveUnionMembers } from './reactive-projection';
import { invalidateOwnedQueries, type RefreshScope } from './query-invalidation';
import { createQueryResultView } from './query-session.svelte';
import { createOvertimeTracker, type OvertimeOptions } from './hook-utils.svelte';
import { getAdminOptions } from './options.svelte';
import { captureAuthLiveScope, clearAuthQueries, handleAuthError } from './auth-hooks.svelte';
import { auditWithProvider } from './audit';
import { HttpError } from './types';
import { useTranslation } from './i18n.svelte';
import { toast } from './toast.svelte';

export interface ContractCreateOptions<S extends ContractSchemas> {
  resource: ResourceContract<S>;
  enabled?: boolean;
  overtimeOptions?: OvertimeOptions;
}
type Result<S extends ContractSchemas> = { data: ContractRecord<S> };
interface Callbacks<S extends ContractSchemas> {
  onSuccess?: (data: Result<S>, params: ContractCreateParams<S>) => void | Promise<void>;
  onError?: (error: HttpError, params: ContractCreateParams<S> | undefined) => void | Promise<void>;
  onSettled?: (data: Result<S> | undefined, error: HttpError | null, params: ContractCreateParams<S> | undefined) => void | Promise<void>;
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
  const contract = code === 'INVALID_RESOURCE_CONTRACT' && !dispatched;
  const response = code === 'INVALID_PROVIDER_RESPONSE';
  return new HttpError(input ? 'Invalid create input' : contract ? 'A create schema is required'
    : response ? 'Invalid provider response' : 'Create failed',
  input ? 422 : contract ? 400 : response ? 502 : status === 401 || status === 403 ? status : 500, undefined, {
    code: input ? 'INVALID_RESOURCE_INPUT' : contract ? 'INVALID_RESOURCE_CONTRACT'
      : response ? 'INVALID_PROVIDER_RESPONSE' : 'CREATE_FAILED',
    details: { phase: dispatched ? 'response' : 'input', writeMayHaveSucceeded: dispatched },
  });
}
function copyFailure(error: HttpError): HttpError {
  return new HttpError(error.message, error.statusCode, undefined, {
    ...definedOptions({ code: error.code }), details: snapshotPlainData(error.details ?? {}),
  });
}

/** A create and its completion retain the captured resource and authentication revision. */
export function useContractCreate<S extends ContractSchemas>(options: ContractCreateOptions<S>) {
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
  function captureScope(input: ReturnType<typeof snapshotCreateParams>) {
    const origin = captureOrigin();
    const contract = origin.contract;
    const captured = captureQueryProvider(context, {
      resource: contract.name, ...definedOptions({ meta: input.meta, dataProviderName: input.dataProviderName }),
    });
    const name = context.resolveDataProviderName(contract.name, input.dataProviderName);
    const raw = context.providers?.[name];
    if (!raw) throw new HttpError('Data provider unavailable', 400);
    return {
      ...origin, ...captured, create: raw.create.bind(raw),
      matcher: { ...context.queryKeyMatcher(contract.name, input.dataProviderName), contract: contractKey(contract) },
      notification: context.notificationProvider, audit: context.auditLogProvider, live: context.liveProvider,
      key: JSON.stringify([contractKey(contract), name, captured.source, context.tenantCacheKey?.__svadminTenant, captured.meta]),
    };
  }
  function capture(params: ContractCreateParams<S>) {
    const input = snapshotCreateParams(params);
    const scope = captureScope(input);
    const { variables } = parseCreateParams(scope.contract, input);
    if (options.enabled !== undefined && typeof options.enabled !== 'boolean') {
      throw new HttpError('Invalid enabled value', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
    }
    return { ...scope, input, variables, suppliedId: createInputId(scope.contract, variables),
      signature: JSON.stringify([scope.key, scope.authScope.cacheKey, variables]) };
  }
  type Scope = ReturnType<typeof capture>;
  type Invocation = {
    scope: Scope | undefined; origin: ReturnType<typeof captureOrigin>;
    token: object; callbacks: Callbacks<S>; readScope(): Scope; markDispatched(): void;
  };
  let latest = $state.raw<Scope>();
  let latestToken: object | undefined;
  let active: { scope: Scope; promise: Promise<Result<S>>; token: object; wasDispatched(): boolean } | undefined;
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
    return new HttpError('Create scope changed', 409, undefined, {
      code: 'CREATE_CANCELLED', details: {
        writeMayHaveSucceeded: dispatched,
        ...definedOptions({
          suppliedId: scope?.suppliedId,
          created: scope && sessionCurrent(scope) && result ? snapshotPlainData(result.data) : undefined,
        }),
      },
    });
  }
  function copyResult(scope: Scope, result: Result<S>): Result<S> {
    return { data: parseContractRecord(scope.contract, result.data) };
  }
  function notify(scope: Scope, current: () => boolean, type: 'success' | 'error', message: string): void {
    observe(() => {
      if (!current()) return;
      if (scope.notification) return scope.notification.open({ type, message });
      if (type === 'success') toast.success(message);
      else toast.error(message);
    });
  }
  async function refresh(scope: Scope, id: string | number | undefined) {
    const scopes: RefreshScope[] = ['list', 'many'];
    if (id !== undefined) scopes.push('detail');
    try {
      await invalidateOwnedQueries({
        client, matcher: { ...scope.matcher, resource: scope.contract.name },
        owner: { source: scope.source, authSession: scope.authScope.cacheKey },
        scopes, current: () => sessionCurrent(scope), ...definedOptions({ id }),
      });
    } catch {
      // Refresh failure cannot falsify a write receipt; currentness is checked after settlement.
    }
  }
  const mutation = createMutation<Result<S>, HttpError, Invocation>(() => ({
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
      let rejected: HttpError | undefined;
      const current = () => isCurrent(scope) && latestToken === invocation.token;
      const ensureCurrent = () => { if (!current() || active?.token !== invocation.token) throw cancelled(scope, dispatched, result); };
      try {
        ensureCurrent();
        const request = {
          resource: scope.contract.name, variables: snapshotPlainData(scope.variables),
          ...definedOptions({ meta: scope.meta === undefined ? undefined : decodeBaseRecord(snapshotPlainData(scope.meta)) }),
        };
        dispatched = true;
        invocation.markDispatched();
        const response = await scope.create(request);
        if (!sessionCurrent(scope)) throw cancelled(scope, dispatched);
        result = decodeCreateReceipt(scope.contract, response, scope.suppliedId);
      } catch (cause) {
        rejected = failure(cause, dispatched);
      } finally {
        if (result && sessionCurrent(scope)) {
          const id = parseContractId(scope.contract, result.data.id);
          auditWithProvider({ action: 'create', resource: scope.contract.name, recordId: id,
            ...definedOptions({ meta: scope.meta }) }, scope.audit, () => sessionCurrent(scope));
          observe(() => {
            if (sessionCurrent(scope)) return scope.live?.publish?.({ type: 'INSERT', resource: scope.contract.name, payload: { ids: [id] } });
          });
        }
        if (dispatched && sessionCurrent(scope)) {
          await refresh(scope, result ? parseContractId(scope.contract, result.data.id) : scope.suppliedId);
        }
      }
      ensureCurrent();
      if (rejected || !result) {
        const error = rejected ?? failure(undefined, dispatched);
        observe(async () => {
          await handleAuthError(copyFailure(error), context,
            () => targetCurrent(scope) && latestToken === invocation.token,
            () => clearAuthQueries(client, scope.auth), scope.authScope,
            () => mounted && latestToken !== invocation.token);
        });
        notify(scope, current, 'error', i18n.t('common.operationFailed'));
        observe(() => { if (current()) return invocation.callbacks.onError?.(copyFailure(error), parseCreateParams(scope.contract, scope.input)); });
        observe(() => { if (current()) return invocation.callbacks.onSettled?.(undefined, copyFailure(error), parseCreateParams(scope.contract, scope.input)); });
        throw error;
      }
      const completed = result;
      notify(scope, current, 'success', i18n.t('common.createSuccess'));
      observe(() => { if (current()) return invocation.callbacks.onSuccess?.(copyResult(scope, completed), parseCreateParams(scope.contract, scope.input)); });
      observe(() => { if (current()) return invocation.callbacks.onSettled?.(copyResult(scope, completed), null, parseCreateParams(scope.contract, scope.input)); });
      ensureCurrent();
      return copyResult(scope, completed);
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

  function detachedPromise(promise: Promise<Result<S>>, scope: Scope, token: object, wasDispatched: () => boolean): Promise<Result<S>> {
    return promise.then(data => {
      if (!isCurrent(scope) || latestToken !== token) throw cancelled(scope, wasDispatched(), data);
      return copyResult(scope, data);
    }, (cause: unknown) => {
      if (!sessionCurrent(scope)) throw cancelled(scope, wasDispatched());
      throw cause instanceof HttpError ? copyFailure(cause) : failure(cause, wasDispatched());
    });
  }
  function mutateAsync(params: ContractCreateParams<S>, callbacks: Callbacks<S> = {}): Promise<Result<S>> {
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
            observe(() => observer.onSuccess?.(copyResult(owner, data), parseCreateParams(owner.contract, owner.input)));
            observe(() => {
              if (isCurrent(owner) && latestToken === token) return observer.onSettled?.(copyResult(owner, data), null, parseCreateParams(owner.contract, owner.input));
            });
          }
          if (!isCurrent(owner) || latestToken !== token) throw cancelled(owner, true, data);
          return data;
        }, (cause: unknown) => {
          const error = cause instanceof HttpError ? cause : failure(cause, true);
          if (isCurrent(owner) && latest === owner) {
            observe(() => observer.onError?.(copyFailure(error), parseCreateParams(owner.contract, owner.input)));
            observe(() => {
              if (isCurrent(owner) && latestToken === token) return observer.onSettled?.(undefined, copyFailure(error), parseCreateParams(owner.contract, owner.input));
            });
          }
          throw error;
        });
      }
      return Promise.reject(new HttpError('Create is already running', 409, undefined, { code: 'CREATE_BUSY' }));
    }
    const token = {};
    latestToken = token;
    latest = scope;
    const target = scope;
    let dispatched = false;
    const wasDispatched = () => dispatched;
    // Keep scope and token identities intact through Svelte's mutation-state projection.
    const promise = mutation.mutateAsync(Object.freeze({
      scope, origin: scope, token, callbacks: definedOptions(observer), readScope: () => target,
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
      return scope ? parseCreateParams(scope.contract, scope.input) : undefined;
    },
    mutateAsync,
    mutate(params: ContractCreateParams<S>, callbacks?: Callbacks<S>): void {
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
