import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { captureAdminContext } from './context.svelte';
import { captureQueryProvider } from './query-snapshot';
import { snapshotCreateManyParams, parseCreateManyParams, decodeCreateManyReceipt, suppliedCreateId, CreateManyPartialError,
  type ContractCreateManyParams } from './create-many-contract';
import { contractKey, parseContractRecord, parseContractId, type ContractSchemas, type ContractRecord, type ResourceContract } from './resource-contract';
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

export interface ContractCreateManyOptions<S extends ContractSchemas> {
  resource: ResourceContract<S>;
  enabled?: boolean;
  overtimeOptions?: OvertimeOptions;
}
type Result<S extends ContractSchemas> = { data: ContractRecord<S>[] };
type Failure = HttpError | CreateManyPartialError;
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
  const contract = code === 'INVALID_RESOURCE_CONTRACT' && !dispatched;
  const response = code === 'INVALID_PROVIDER_RESPONSE';
  return new HttpError(input ? 'Invalid batch create input' : contract ? 'A create schema is required'
    : response ? 'Invalid provider response' : 'Batch create failed',
  input ? 422 : contract ? 400 : response ? 502 : status === 401 || status === 403 ? status : 500, undefined, {
    code: input ? 'INVALID_RESOURCE_INPUT' : contract ? 'INVALID_RESOURCE_CONTRACT'
      : response ? 'INVALID_PROVIDER_RESPONSE' : 'CREATE_MANY_FAILED',
    details: { writeMayHaveSucceeded: dispatched },
  });
}
function copyFailure(error: Failure): Failure {
  if (error instanceof CreateManyPartialError) {
    return new CreateManyPartialError(error.succeeded, error.failedIndexes, error.causes.map(cause => failure(cause, true)));
  }
  return new HttpError(error.message, error.statusCode, undefined, {
    ...definedOptions({ code: error.code }), details: snapshotPlainData(error.details ?? {}),
  });
}

/** Batch progress and completion remain owned by one resource and auth revision. */
export function useContractCreateMany<S extends ContractSchemas>(options: ContractCreateManyOptions<S>) {
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
  function captureScope(input: ReturnType<typeof snapshotCreateManyParams>) {
    const origin = captureOrigin();
    const contract = origin.contract;
    const captured = captureQueryProvider(context, {
      resource: contract.name, ...definedOptions({ meta: input.meta, dataProviderName: input.dataProviderName }),
    });
    const name = context.resolveDataProviderName(contract.name, input.dataProviderName);
    const raw = context.providers?.[name];
    if (!raw) throw new HttpError('Data provider unavailable', 400);
    return {
      ...origin, ...captured, create: raw.create.bind(raw), createMany: raw.createMany?.bind(raw),
      matcher: { ...context.queryKeyMatcher(contract.name, input.dataProviderName), contract: contractKey(contract) },
      notification: context.notificationProvider, audit: context.auditLogProvider, live: context.liveProvider,
      key: JSON.stringify([contractKey(contract), name, captured.source, context.tenantCacheKey?.__svadminTenant, captured.meta]),
    };
  }
  function capture(params: ContractCreateManyParams<S>) {
    const input = snapshotCreateManyParams(params);
    const scope = captureScope(input);
    const { variables } = parseCreateManyParams(scope.contract, input);
    if (options.enabled !== undefined && typeof options.enabled !== 'boolean') {
      throw new HttpError('Invalid enabled value', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
    }
    return { ...scope, input, variables, signature: JSON.stringify([scope.key, scope.authScope.cacheKey, variables]) };
  }
  type Scope = ReturnType<typeof capture>;
  type Progress = {
    attempted: number[]; succeeded: { index: number; record: ContractRecord<S> }[]; failed: number[];
  };
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
    return new HttpError('Batch create scope changed', 409, undefined, {
      code: 'CREATE_MANY_CANCELLED', details: {
        writeMayHaveSucceeded: progress.attempted.length > 0,
        attemptedIndexes: [...progress.attempted], failedIndexes: [...progress.failed],
        ...definedOptions({
          succeeded: scope && sessionCurrent(scope) ? snapshotPlainData(progress.succeeded) : undefined,
          unattemptedIndexes: scope?.variables.map((_, index) => index).filter(index => !progress.attempted.includes(index)),
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
  async function refresh(scope: Scope, attempted: readonly number[], ids: ReadonlySet<string | number>) {
    if (!attempted.length) return;
    const owner = {
      client, matcher: { ...scope.matcher, resource: scope.contract.name },
      owner: { source: scope.source, authSession: scope.authScope.cacheKey },
      current: () => sessionCurrent(scope),
    };
    // Every started collection/detail refresh settles even if a sibling fails or retires.
    await Promise.allSettled([
      invalidateOwnedQueries({ ...owner, scopes: ['list', 'many'] }),
      ...[...ids].map(id => invalidateOwnedQueries({ ...owner, scopes: ['detail'], id })),
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
      const seen = new Set<string | number>();
      const details = new Set<string | number>();
      let rejected: Failure | undefined;
      const current = () => isCurrent(scope) && latestToken === invocation.token;
      const ensureCurrent = () => {
        if (!current() || active?.token !== invocation.token) throw cancelled(scope, progress);
      };
      const request = () => ({
        resource: scope.contract.name,
        ...definedOptions({ meta: scope.meta === undefined ? undefined : decodeBaseRecord(snapshotPlainData(scope.meta)) }),
      });
      const attempt = (input: unknown, index: number) => {
        const id = suppliedCreateId(scope.contract, input);
        if (id !== undefined) details.add(id);
        attempted.push(index);
      };
      try {
        ensureCurrent();
        if (scope.createMany) {
          const params = {
            ...request(), variables: scope.variables.map(value => snapshotPlainData(value)),
          };
          scope.variables.forEach(attempt);
          const response = await scope.createMany(params);
          if (!sessionCurrent(scope)) throw cancelled(scope, progress);
          const records = decodeCreateManyReceipt(scope.contract, scope.variables, response, true, seen);
          records.forEach((record, index) => {
            succeeded.push({ index, record });
            details.add(parseContractId(scope.contract, record.id));
          });
        } else {
          for (const [index, input] of scope.variables.entries()) {
            ensureCurrent();
            const params = { ...request(), variables: snapshotPlainData(input) };
            attempt(input, index);
            try {
              const response = await scope.create(params);
              if (!sessionCurrent(scope)) throw cancelled(scope, progress);
              for (const record of decodeCreateManyReceipt(scope.contract, [input], response, false, seen)) {
                const id = parseContractId(scope.contract, record.id);
                succeeded.push({ index, record });
                seen.add(id);
                details.add(id);
              }
            } catch (cause) {
              if (!sessionCurrent(scope)) throw cancelled(scope, progress);
              failed.push(index);
              causes.push(failure(cause, true));
            }
          }
          if (failed.length) rejected = new CreateManyPartialError(succeeded, failed, causes);
        }
      } catch (cause) {
        rejected = failure(cause, attempted.length > 0);
      } finally {
        for (const { record } of succeeded) {
          if (!sessionCurrent(scope)) break;
          auditWithProvider({ action: 'create', resource: scope.contract.name,
            recordId: parseContractId(scope.contract, record.id), ...definedOptions({ meta: scope.meta }) },
          scope.audit, () => sessionCurrent(scope));
        }
        if (succeeded.length) observe(() => {
          if (sessionCurrent(scope)) return scope.live?.publish?.({
            type: 'INSERT', resource: scope.contract.name,
            payload: { ids: succeeded.map(({ record }) => parseContractId(scope.contract, record.id)) },
          });
        });
        if (sessionCurrent(scope)) await refresh(scope, attempted, details);
      }
      ensureCurrent();
      if (rejected) {
        const error = rejected;
        const authError = error instanceof CreateManyPartialError
          ? error.causes.find(cause => cause.statusCode === 401 || cause.statusCode === 403) ?? error.causes[0] ?? error
          : error;
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
      const result = { data: succeeded.map(({ record }) => record) };
      notify(scope, current, 'success', i18n.t('common.createSuccess'));
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
  function mutateAsync(params: ContractCreateManyParams<S>, callbacks: Callbacks<S> = {}): Promise<Result<S>> {
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
      return Promise.reject(new HttpError('Batch create is already running', 409, undefined, { code: 'CREATE_MANY_BUSY' }));
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
      return scope ? parseCreateManyParams(scope.contract, scope.input) : undefined;
    },
    mutateAsync,
    mutate(params: ContractCreateManyParams<S>, callbacks?: Callbacks<S>): void {
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
