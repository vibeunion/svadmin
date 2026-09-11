import type { TObject, TSchema } from '@sinclair/typebox';
import { hashKey, useQueryClient } from '@tanstack/svelte-query';
import { captureAdminContext, type AdminContextAccessor } from './context.svelte';
import { commandDefinition, prepareCommand, parseCommandInput, parseCommandResponse,
  type CommandContract, type CommandInput, type CommandOutput } from './command-contract';
import { captureAuthLiveScope, clearAuthQueries, handleAuthError } from './auth-hooks.svelte';
import { createSessionQuery } from './session-query.svelte';
import { createQueryResultView, supersededQuerySession } from './query-session.svelte';
import { definedOptions } from './defined-options';
import { keys } from './query-keys';
import { HttpError, type DataProvider } from './types';

type Result<O extends TSchema> = { data: CommandOutput<O> };
interface CommandOptions<I extends TObject, O extends TSchema> {
  command: CommandContract<I, O>;
  dataProviderName?: string;
}
interface Callbacks<I extends TObject, O extends TSchema> {
  onSuccess?: (data: Result<O>, input: CommandInput<I>) => void | Promise<void>;
  onError?: (error: HttpError, input: CommandInput<I> | undefined) => void | Promise<void>;
  onSettled?: (data: Result<O> | undefined, error: HttpError | null, input: CommandInput<I> | undefined) => void | Promise<void>;
}
type CommandState<I extends TObject, O extends TSchema> =
  | { readonly status: 'idle'; readonly isIdle: true; readonly isPending: false; readonly isSuccess: false; readonly isError: false;
      readonly data: undefined; readonly error: null; readonly variables: undefined }
  | { readonly status: 'pending'; readonly isIdle: false; readonly isPending: true; readonly isSuccess: false; readonly isError: false;
      readonly data: undefined; readonly error: null; readonly variables: CommandInput<I> }
  | { readonly status: 'success'; readonly isIdle: false; readonly isPending: false; readonly isSuccess: true; readonly isError: false;
      readonly data: Result<O>; readonly error: null; readonly variables: CommandInput<I> }
  | { readonly status: 'error'; readonly isIdle: false; readonly isPending: false; readonly isSuccess: false; readonly isError: true;
      readonly data: undefined; readonly error: HttpError; readonly variables: CommandInput<I> | undefined };

const sources = new WeakMap<DataProvider, string>();
const runtime = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
let nextSource = 0;
function captureProvider(context: AdminContextAccessor, override: string | undefined) {
  const name = override ?? 'default';
  if (typeof name !== 'string' || !name.length) {
    throw new HttpError('Invalid command provider', 422, undefined, { code: 'INVALID_COMMAND_INPUT' });
  }
  const provider = context.providers?.[name];
  if (!provider) throw new HttpError('Data provider unavailable', 400, undefined, { code: 'DATA_PROVIDER_REQUIRED' });
  let source = sources.get(provider);
  if (source === undefined) {
    source = `command:${runtime}:${++nextSource}`;
    sources.set(provider, source);
  }
  return { provider, name, source };
}
function requireMethod(command: CommandContract, read: boolean) {
  const definition = commandDefinition(command);
  if ((definition.method === 'get') !== read) {
    throw new HttpError(read ? 'Queries require a GET command' : 'Mutations require a write command', 400, undefined, {
      code: 'INVALID_COMMAND_METHOD',
    });
  }
  return definition;
}
function observe(callback: () => void | Promise<unknown>): void {
  try { void Promise.resolve(callback()).catch(() => {}); }
  catch { /* Observers do not own the command outcome. */ }
}
function failure(cause: unknown, dispatched = false): HttpError {
  let status = 502;
  let code = 'COMMAND_FAILED';
  try {
    if (typeof cause === 'object' && cause !== null) {
      const value: unknown = Object.getOwnPropertyDescriptor(cause, 'statusCode')?.value;
      const label: unknown = Object.getOwnPropertyDescriptor(cause, 'code')?.value;
      if (typeof value === 'number' && Number.isInteger(value) && value >= 400 && value <= 599) status = value;
      if (label === 'INVALID_COMMAND_INPUT' || label === 'INVALID_COMMAND_RESPONSE' ||
          label === 'INVALID_COMMAND_CONTRACT' || label === 'INVALID_COMMAND_METHOD' ||
          label === 'COMMAND_NOT_SUPPORTED' || label === 'DATA_PROVIDER_REQUIRED') code = label;
    }
  } catch { /* Reflection errors remain private. */ }
  return new HttpError('Command failed', status, undefined, { code, details: { writeMayHaveSucceeded: dispatched } });
}
function cancelled(dispatched: boolean): HttpError {
  return new HttpError('Command scope changed', 409, undefined, {
    code: 'COMMAND_CANCELLED', details: { writeMayHaveSucceeded: dispatched },
  });
}

export function useCustom<I extends TObject, O extends TSchema>(options: CommandOptions<I, O> & {
  input: NoInfer<CommandInput<I>>;
  queryOptions?: { enabled?: boolean; staleTime?: number };
}) {
  const context = captureAdminContext();
  const query = createSessionQuery<Result<O>>(context, () => {
    const command = options.command;
    const definition = requireMethod(command, true);
    const override = options.dataProviderName;
    const captured = captureProvider(context, override);
    const tenant = context.tenantCacheKey?.__svadminTenant;
    const prepared = prepareCommand(captured.provider, command, options.input);
    const signature = hashKey([prepared.input]);
    const { enabled = true, staleTime } = options.queryOptions ?? {};
    if (typeof enabled !== 'boolean' || (staleTime !== undefined &&
        (typeof staleTime !== 'number' || Number.isNaN(staleTime) || staleTime < 0))) {
      throw new HttpError('Invalid command query settings', 422, undefined, { code: 'INVALID_COMMAND_INPUT' });
    }
    return {
      resource: command.name, successNotification: false, errorNotification: false,
      queryKey: keys(definedOptions({
        provider: captured.name, contract: definition.key, tenant,
      })).custom.call(definition.key, definition.key, definition.method, { input: prepared.input, source: captured.source }),
      queryFn: (signal) => {
        if (command !== options.command || override !== options.dataProviderName ||
            tenant !== context.tenantCacheKey?.__svadminTenant ||
            captured.provider !== captureProvider(context, override).provider ||
            signature !== hashKey([parseCommandInput(command, options.input)])) throw supersededQuerySession();
        return prepared.execute(signal);
      },
      decode: value => parseCommandResponse(command, value),
      enabled, ...definedOptions({ staleTime }),
    };
  });
  return { query };
}

/** Command writes own their state and observers; native mutation defaults are not a dispatch boundary. */
export function useCustomMutation<I extends TObject, O extends TSchema>(options: CommandOptions<I, O>) {
  requireMethod(options.command, false);
  const context = captureAdminContext();
  const client = useQueryClient();
  let mounted = true;
  function origin() {
    const auth = context.authProvider;
    const authScope = captureAuthLiveScope(auth);
    const router = context.routerProvider;
    const tenant = context.tenantCacheKey?.__svadminTenant;
    const command = options.command;
    const override = options.dataProviderName;
    return {
      command, definition: requireMethod(command, false), override,
      auth, authScope, router, tenant, ...captureProvider(context, override),
    };
  }
  function capture(owner: ReturnType<typeof origin>, input: CommandInput<I>) {
    const prepared = prepareCommand(owner.provider, owner.command, input);
    return { ...owner, prepared, signature: hashKey([owner.definition.key, owner.source,
      owner.tenant, owner.authScope.cacheKey, prepared.input]) };
  }
  type Origin = ReturnType<typeof origin>;
  type Scope = ReturnType<typeof capture>;
  type Invocation = { scope: Scope; token: object; dispatched: boolean; promise: Promise<Result<O>> };
  let state = $state.raw<CommandState<I, O>>(idle());
  let latest = $state.raw<Scope | undefined>();
  let failedOrigin = $state.raw<Origin | undefined>();
  let latestToken: object | undefined;
  let active: Invocation | undefined;
  let controlEpoch = 0;
  function idle(): CommandState<I, O> {
    return { status: 'idle', isIdle: true, isPending: false, isSuccess: false, isError: false,
      data: undefined, error: null, variables: undefined };
  }
  function originCurrent(owner: Origin): boolean {
    try {
      return mounted && owner.command === options.command && owner.override === options.dataProviderName &&
        owner.auth === context.authProvider && owner.router === context.routerProvider &&
        owner.tenant === context.tenantCacheKey?.__svadminTenant;
    } catch { return false; }
  }
  function targetCurrent(scope: Origin): boolean {
    try {
      return originCurrent(scope) && captureProvider(context, scope.override).provider === scope.provider;
    } catch { return false; }
  }
  const current = (scope: Scope, token: object) =>
    targetCurrent(scope) && scope.authScope.isCurrent() && latestToken === token;
  function copyError(error: HttpError, dispatched: boolean): HttpError {
    return error.code === 'COMMAND_CANCELLED' ? cancelled(dispatched) : failure(error, dispatched);
  }
  function callbacks(value: Callbacks<I, O>): Callbacks<I, O> {
    if (typeof value !== 'object' || value === null) {
      throw new HttpError('Invalid command callbacks', 422, undefined, { code: 'INVALID_COMMAND_INPUT' });
    }
    function read(name: keyof Callbacks<I, O>) {
      const descriptor = Object.getOwnPropertyDescriptor(value, name);
      if (!descriptor) return undefined;
      const callback: unknown = descriptor.value;
      if (!('value' in descriptor) || (callback !== undefined && typeof callback !== 'function')) {
        throw new HttpError('Invalid command callbacks', 422, undefined, { code: 'INVALID_COMMAND_INPUT' });
      }
      return typeof callback === 'function' ? async (...args: unknown[]): Promise<void> => {
        const result: unknown = Reflect.apply(callback, undefined, args);
        await result;
      } : undefined;
    }
    return definedOptions({ onSuccess: read('onSuccess'), onError: read('onError'), onSettled: read('onSettled') });
  }
  function ensure(invocation: Invocation): void {
    if (!current(invocation.scope, invocation.token)) throw cancelled(invocation.dispatched);
  }
  async function run(invocation: Invocation): Promise<Result<O>> {
    const { scope, token } = invocation;
    ensure(invocation);
    let result: Result<O>;
    try {
      invocation.dispatched = true;
      result = await scope.prepared.execute();
    } catch (cause) {
      ensure(invocation);
      const error = failure(cause, invocation.dispatched);
      state = { status: 'error', isIdle: false, isPending: false, isSuccess: false, isError: true,
        data: undefined, error, variables: scope.prepared.input };
      observe(() => handleAuthError(copyError(error, invocation.dispatched), context,
        () => targetCurrent(scope) && latestToken === token,
        () => clearAuthQueries(client, scope.auth), scope.authScope));
      throw error;
    }
    ensure(invocation);
    state = { status: 'success', isIdle: false, isPending: false, isSuccess: true, isError: false,
      data: result, error: null, variables: scope.prepared.input };
    return result;
  }
  function deliver(invocation: Invocation, observers: Callbacks<I, O>): Promise<Result<O>> {
    const { scope } = invocation;
    return invocation.promise.then(result => {
      ensure(invocation);
      observe(() => observers.onSuccess?.(parseCommandResponse(scope.command, result), scope.prepared.input));
      ensure(invocation);
      observe(() => observers.onSettled?.(parseCommandResponse(scope.command, result), null, scope.prepared.input));
      ensure(invocation);
      return parseCommandResponse(scope.command, result);
    }, (cause: unknown) => {
      ensure(invocation);
      const error = failure(cause, invocation.dispatched);
      observe(() => observers.onError?.(copyError(error, invocation.dispatched), scope.prepared.input));
      ensure(invocation);
      observe(() => observers.onSettled?.(undefined, copyError(error, invocation.dispatched), scope.prepared.input));
      ensure(invocation);
      throw error;
    });
  }
  function mutateAsync(input: NoInfer<CommandInput<I>>, value: Callbacks<I, O> = {}): Promise<Result<O>> {
    const epoch = controlEpoch;
    let owner: Origin;
    try { owner = origin(); }
    catch (cause) { return Promise.reject(epoch === controlEpoch ? failure(cause) : cancelled(false)); }
    const available = () => epoch === controlEpoch && targetCurrent(owner) && owner.authScope.isCurrent();
    if (!available()) return Promise.reject(cancelled(false));
    let scope: Scope;
    let observers: Callbacks<I, O> = {};
    try {
      observers = callbacks(value);
      scope = capture(owner, input);
    } catch (cause) {
      if (!available()) return Promise.reject(cancelled(false));
      const error = failure(cause);
      const preserved = active && current(active.scope, active.token);
      const token = preserved ? latestToken : {};
      if (!preserved) {
        controlEpoch++;
        active = undefined;
        latest = undefined;
        failedOrigin = owner;
        latestToken = token;
        state = { status: 'error', isIdle: false, isPending: false, isSuccess: false, isError: true,
          data: undefined, error, variables: undefined };
      }
      return Promise.resolve().then(() => {
        const ensure = () => {
          if (!targetCurrent(owner) || !owner.authScope.isCurrent() || latestToken !== token) throw cancelled(false);
        };
        ensure();
        observe(() => observers.onError?.(copyError(error, false), undefined));
        ensure();
        observe(() => observers.onSettled?.(undefined, copyError(error, false), undefined));
        ensure();
        throw copyError(error, false);
      });
    }
    if (!available()) return Promise.reject(cancelled(false));
    if (active && current(active.scope, active.token)) {
      if (active.scope.signature === scope.signature) return deliver(active, observers);
      return Promise.reject(new HttpError('A command is already running', 409, undefined, { code: 'COMMAND_BUSY' }));
    }
    const token = {};
    controlEpoch++;
    latestToken = token;
    latest = scope;
    failedOrigin = undefined;
    state = { status: 'pending', isIdle: false, isPending: true, isSuccess: false, isError: false,
      data: undefined, error: null, variables: scope.prepared.input };
    const invocation: Invocation = { scope, token, dispatched: false, promise: Promise.resolve().then(() => run(invocation)) };
    invocation.promise = invocation.promise.finally(() => { if (active === invocation) active = undefined; });
    active = invocation;
    return deliver(invocation, observers);
  }
  function reset(): void {
    controlEpoch++;
    active = undefined;
    latest = undefined;
    failedOrigin = undefined;
    latestToken = undefined;
    state = idle();
  }
  $effect.pre(() => {
    const scope = latest ?? failedOrigin;
    if (scope && (!targetCurrent(scope) || !scope.authScope.isCurrent())) {
      controlEpoch++;
      // Auth retirement must not cancel the checked delegate's own logout intent.
      if (!targetCurrent(scope)) latestToken = undefined;
      latest = undefined;
      failedOrigin = undefined;
      active = undefined;
      state = idle();
    }
  });
  $effect(() => () => { mounted = false; reset(); });
  function projection(): CommandState<I, O> {
    const scope = latest;
    const owner = scope ?? failedOrigin;
    if (!mounted || (owner && (!targetCurrent(owner) || !owner.authScope.isCurrent()))) return idle();
    if (state.isIdle) return state;
    const variables = scope ? parseCommandInput(scope.command, state.variables) : undefined;
    if (state.isError) return { ...state, error: failure(state.error, scope !== undefined), variables };
    if (!scope || variables === undefined) return idle();
    if (state.isSuccess) return { ...state, data: parseCommandResponse(scope.command, state.data), variables };
    return { ...state, variables };
  }
  const controls = {
    mutateAsync, reset,
    mutate(input: NoInfer<CommandInput<I>>, observers?: Callbacks<I, O>): void {
      void mutateAsync(input, observers).catch(() => {});
    },
  };
  const mutation = createQueryResultView((): CommandState<I, O> & Readonly<typeof controls> => ({
    ...projection(), ...controls,
  }));
  return { mutation };
}
