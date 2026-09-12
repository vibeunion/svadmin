import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { tick } from 'svelte';
import { captureAdminContext } from './context.svelte';
import { captureQueryProvider, snapshotOneParams } from './query-snapshot';
import { contractKey, formatContractRouteId, parseContractId, parseContractRecord, parseContractCreateInput, parseContractUpdateInput,
  getContractFormFields, snapshotContractFormDraft, contractFormInvalidFields,
  type ResourceContract, type ContractSchemas, type ContractId, type ContractRecord,
  type ContractFormAction, type ContractFormDraft, type ContractFormValues } from './resource-contract';
import { validateUpdateIdentity } from './update-contract';
import { createInputId } from './create-contract';
import { decodeBaseRecord, decodeOneResult, rejectProviderResponse } from './record-decoder';
import { snapshotPlainData } from './plain-data';
import { definedOptions } from './defined-options';
import { keys } from './query-keys';
import { invalidateOwnedQueries } from './query-invalidation';
import { appendListQueryFromPath } from './url-sync';
import { HttpError } from './types';
import { useTranslation } from './i18n.svelte';
import { Type } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { auditWithProvider } from './audit';
import { fireSuccessNotification, fireErrorNotification } from './hook-utils.svelte';
import { captureAuthLiveScope, clearAuthQueries, handleAuthError } from './auth-hooks.svelte';
import { getAdminOptions } from './options.svelte';

type Redirect = 'list' | 'edit' | 'show' | false;
type Values<S extends ContractSchemas, A extends ContractFormAction> = ContractFormValues<S, A>;
type Draft<S extends ContractSchemas, A extends ContractFormAction> = ContractFormDraft<S, A>;
type Field<S extends ContractSchemas, A extends ContractFormAction> = Extract<keyof Values<S, A>, string>;
interface FormOptions<S extends ContractSchemas, A extends ContractFormAction> {
  resource: ResourceContract<S>;
  action: A;
  id?: NoInfer<ContractId<S>>;
  defaultValues?: NoInfer<Partial<Values<S, A>>>;
  enabled?: boolean;
  redirect?: Redirect;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  validate?: (values: NoInfer<Draft<S, A>>) => Record<string, string> | null;
  onMutationSuccess?: (result: { data: NoInfer<ContractRecord<S>> }) => void | Promise<void>;
  onMutationError?: (error: HttpError) => void | Promise<void>;
  warnWhenUnsavedChanges?: boolean;
}
export type ContractFormOptions<S extends ContractSchemas, A extends ContractFormAction> =
  FormOptions<S, A> & ([Values<NoInfer<S>, NoInfer<A>>] extends [never] ? never : unknown) &
  (ContractSchemas extends S ? unknown : A extends 'create' ? { id?: never } : { id: NoInfer<ContractId<S>> });

function cancelled(dispatched = false): HttpError {
  return new HttpError('Form scope changed', 409, undefined, {
    code: 'FORM_CANCELLED', details: { writeMayHaveSucceeded: dispatched },
  });
}
function failure(cause: unknown, dispatched = false): HttpError {
  let code: unknown;
  let status: unknown;
  try {
    if (typeof cause === 'object' && cause !== null) {
      code = Object.getOwnPropertyDescriptor(cause, 'code')?.value;
      status = Object.getOwnPropertyDescriptor(cause, 'statusCode')?.value;
    }
  } catch { /* Untrusted error reflection must not replace the original failure. */ }
  const input = code === 'INVALID_RESOURCE_INPUT' && !dispatched;
  const response = code === 'INVALID_PROVIDER_RESPONSE';
  return new HttpError(input ? 'Invalid form input' : response ? 'Invalid provider response' : 'Form operation failed',
    input ? 422 : response ? 502 : status === 401 || status === 403 ? status : 500, undefined, {
      code: input ? 'INVALID_RESOURCE_INPUT' : response ? 'INVALID_PROVIDER_RESPONSE' : 'FORM_FAILED',
      details: { writeMayHaveSucceeded: dispatched },
    });
}
function copyFailure(error: HttpError): HttpError {
  return new HttpError(error.message, error.statusCode, undefined, {
    ...definedOptions({ code: error.code }), details: snapshotPlainData(error.details ?? {}),
  });
}
function notify<T>(callback: ((value: T) => void | Promise<void>) | undefined, value: T): void {
  try { void Promise.resolve(callback?.(value)).catch(() => {}); }
  catch { /* Observers cannot turn successful writes into failed submissions. */ }
}
const errorsSchema = Type.Record(Type.String(), Type.String());
const serverErrorsSchema = Type.Record(Type.String(), Type.Union([Type.String(), Type.Array(Type.String())]));
function serverErrorFields(cause: unknown): string[] {
  try {
    if (typeof cause !== 'object' || cause === null) return [];
    const descriptor = Object.getOwnPropertyDescriptor(cause, 'errors');
    if (!descriptor || !('value' in descriptor)) return [];
    const errors = snapshotPlainData(descriptor.value);
    return checkExact(serverErrorsSchema, errors) ? Object.keys(errors) : [];
  } catch { return []; }
}
const submitSchema = Type.Object({
  redirect: Type.Optional(Type.Union([Type.Literal('list'), Type.Literal('edit'), Type.Literal('show'), Type.Literal(false)])),
}, { additionalProperties: false });
const editSchema = Type.Object({ taint: Type.Optional(Type.Boolean()) }, { additionalProperties: false });
function ownValue(value: object, field: string): unknown {
  return Object.getOwnPropertyDescriptor(value, field)?.value;
}

export function useContractForm<S extends ContractSchemas, A extends ContractFormAction>(
  options: FormOptions<S, A>,
  workflow?: { readonly key: string; readonly enabled?: boolean; reset: () => void },
) {
  const context = captureAdminContext();
  const client = useQueryClient();
  const i18n = useTranslation();
  const adminOptions = getAdminOptions();
  const enabled = () => (options.enabled === undefined || options.enabled === true) &&
    (workflow?.enabled === undefined || workflow.enabled === true);
  contractKey(options.resource);
  getContractFormFields(options.resource, options.action);
  let mounted = true;
  let initial = snapshotContractFormDraft(options.resource, options.action, options.defaultValues ?? {});
  let values = $state<Draft<S, A>>(snapshotContractFormDraft(options.resource, options.action, initial));
  let errors = $state<Record<string, string>>({});
  let tainted = $state<Record<string, boolean>>({});
  let error = $state<HttpError | null>(null);
  let submitting = $state(false);
  let hydratedKey = $state<string | undefined>();
  let active: { token: object; scope: Scope; promise: Promise<{ data: ContractRecord<S> }>; wasDispatched: () => boolean } | undefined;
  let latest: object | undefined;
  let draftRevision = {};

  function captureScope() {
    const contract = options.resource;
    const action = options.action;
    if (!['create', 'edit', 'clone', 'show'].includes(action)) throw new HttpError('Invalid form action', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
    getContractFormFields(contract, action);
    const id = action === 'create' ? undefined : parseContractId(contract, options.id);
    if (action === 'create' && options.id !== undefined) throw new HttpError('Create forms cannot target an ID', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
    const captured = captureQueryProvider(context, { resource: contract.name,
      ...definedOptions({ dataProviderName: options.dataProviderName, meta: options.meta }) });
    const providerName = context.resolveDataProviderName(contract.name, options.dataProviderName);
    const matcher = definedOptions({ ...context.queryKeyMatcher(contract.name, options.dataProviderName), contract: contractKey(contract) });
    const raw = context.providers?.[providerName];
    if (!raw) throw new HttpError('Data provider unavailable', 400, undefined, { code: 'DATA_PROVIDER_REQUIRED' });
    const authScope = captureAuthLiveScope(context.authProvider);
    const targetKey = JSON.stringify([contractKey(contract), action, id, providerName, captured.source, matcher.tenant, captured.meta, enabled(), workflow?.key]);
    return {
      contract, action, id, matcher, ...captured,
      defaults: snapshotContractFormDraft(contract, action, options.defaultValues ?? {}),
      create: raw.create.bind(raw), update: raw.update.bind(raw),
      authProvider: context.authProvider, authScope, router: context.routerProvider,
      notificationProvider: context.notificationProvider, auditLogProvider: context.auditLogProvider,
      liveProvider: context.liveProvider,
      workflowKey: workflow?.key,
      targetKey, key: JSON.stringify([targetKey, authScope.cacheKey]),
    };
  }
  type Scope = ReturnType<typeof captureScope>;
  const state = $derived.by(() => {
    try { return { ok: true as const, scope: captureScope() }; }
    catch (cause) { return { ok: false as const, error: failure(cause) }; }
  });
  function targetCurrent(scope: Scope): boolean {
    return mounted && enabled() && state.ok && state.scope.targetKey === scope.targetKey &&
      context.authProvider === scope.authProvider && context.routerProvider === scope.router;
  }
  function sessionCurrent(scope: Scope): boolean {
    return context.authProvider === scope.authProvider && scope.authScope.isCurrent();
  }
  function isCurrent(scope: Scope): boolean {
    return targetCurrent(scope) && sessionCurrent(scope);
  }
  function ready(): boolean {
    return state.ok && isCurrent(state.scope) && hydratedKey === state.scope.key;
  }
  function draft(scope: Scope, value: unknown) {
    return snapshotContractFormDraft(scope.contract, scope.action, value);
  }
  function recordDraft(scope: Scope, record: ContractRecord<S>): Draft<S, A> {
    const names: readonly string[] = getContractFormFields(scope.contract, scope.action);
    const skip = new Set(scope.action === 'clone'
      ? ['id', '_id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'createdBy', 'updatedBy', 'created_by', 'updated_by'] : []);
    const source = Object.fromEntries(Object.entries(record).filter(([key]) => names.includes(key) && !skip.has(key)));
    return draft(scope, { ...scope.defaults, ...source });
  }
  function queryKey(scope: Scope) {
    return keys(scope.matcher).data.one(scope.contract.name, scope.id ?? '', {
      source: scope.source, authSession: scope.authScope.cacheKey, ...definedOptions({ meta: scope.meta }),
      ...definedOptions({ formWorkflow: scope.workflowKey }),
    });
  }
  const query = createQuery<{ data: ContractRecord<S> }, unknown>(() => {
    const current = state;
    if (!current.ok) return {
      queryKey: ['svadmin-form-disabled', contractKey(options.resource)],
      queryFn: async (): Promise<{ data: ContractRecord<S> }> => { throw current.error; },
      enabled: false, retry: false,
    };
    const scope = current.scope;
    return {
      queryKey: queryKey(scope),
      queryFn: async ({ signal }) => {
        if (!isCurrent(scope)) throw cancelled();
        if (scope.id === undefined) throw new HttpError('A form read requires an ID', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
        const response = await scope.provider.getOne(snapshotOneParams({
          resource: scope.contract.name, id: scope.id, ...definedOptions({ meta: scope.meta, signal }),
        }));
        if (!isCurrent(scope)) throw cancelled();
        const result = decodeOneResult(snapshotPlainData(response), value => parseContractRecord(scope.contract, value));
        if (result.data.id !== scope.id) return rejectProviderResponse();
        return result;
      },
      enabled: enabled() && scope.authScope.available && scope.action !== 'create',
      retry: false,
    };
  });
  function currentQuery() {
    if (!state.ok || !isCurrent(state.scope) || state.scope.action === 'create') return undefined;
    const cached = client.getQueryState(queryKey(state.scope));
    // Reactive observer results can still belong to the previous key before the next flush.
    return cached && cached.data === query.data && cached.error === query.error ? query : undefined;
  }
  let previousKey: string | undefined;
  let previousTarget: string | undefined;
  let previousAuth = context.authProvider;
  let previousRouter = context.routerProvider;
  $effect.pre(() => {
    const key = state.ok ? state.scope.key : undefined;
    const auth = context.authProvider;
    const router = context.routerProvider;
    if (key !== previousKey || auth !== previousAuth || router !== previousRouter) {
      const target = state.ok ? state.scope.targetKey : undefined;
      if (target !== previousTarget || auth !== previousAuth || router !== previousRouter) latest = undefined;
      previousTarget = target;
      previousKey = key;
      previousAuth = auth;
      previousRouter = router;
      active = undefined;
      draftRevision = {};
      submitting = false;
      error = null;
      errors = {};
      tainted = {};
      hydratedKey = undefined;
      values = snapshotContractFormDraft(options.resource, options.action, options.defaultValues ?? {});
      initial = snapshotContractFormDraft(options.resource, options.action, values);
      workflow?.reset();
    }
    if (!state.ok || !isCurrent(state.scope)) return;
    const scope = state.scope;
    if (scope.action === 'create') { hydratedKey = scope.key; return; }
    const result = checkedQueryData();
    if (hydratedKey !== scope.key && result) {
      values = recordDraft(scope, result.data);
      initial = draft(scope, values);
      errors = {};
      tainted = {};
      hydratedKey = scope.key;
    }
  });
  $effect(() => () => {
    mounted = false;
    active = undefined;
    latest = undefined;
    queueMicrotask(() => {
      const current = state;
      if (!current.ok) return;
      const query = client.getQueryCache().find({ queryKey: queryKey(current.scope), exact: true });
      if (query?.getObserversCount() === 0) void query.cancel();
    });
  });

  function isTainted(field?: string): boolean {
    return ready() && (field === undefined ? Object.values(tainted).some(Boolean) : tainted[field] === true);
  }
  function setValues(newValues: Partial<Values<S, A>>, opts: { taint?: boolean } = {}) {
    updateField(newValues, opts);
  }
  function setFieldValue<K extends Field<S, A>>(field: K, value: NoInfer<Values<S, A>[K]> | undefined, opts?: { taint?: boolean }) {
    const next = { [field]: value };
    // The typed setter delegates its runtime check to the same draft boundary as bulk edits.
    updateField(next, opts);
  }
  function updateField(next: Record<string, unknown>, opts?: { taint?: boolean }) {
    if (!state.ok || !isCurrent(state.scope) || state.scope.action === 'show' || hydratedKey !== state.scope.key) return;
    const scope = state.scope;
    const revision = draftRevision;
    const settings = snapshotPlainData(opts === undefined ? {} : opts);
    if (!checkExact(editSchema, settings)) throw new HttpError('Invalid form edit options', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
    const patch = draft(scope, next);
    const changed = Object.keys(next);
    const updated = draft(scope, { ...Object.fromEntries(Object.entries(values).filter(([key]) => !changed.includes(key))), ...patch });
    if (!isCurrent(scope) || revision !== draftRevision) return;
    draftRevision = {};
    values = updated;
    if (settings.taint !== false) tainted = { ...tainted, ...Object.fromEntries(changed.map(key => [key, true])) };
    errors = Object.fromEntries(Object.entries(errors).filter(([key]) => !changed.includes(key)));
    error = null;
  }
  function reset() {
    draftRevision = {};
    active = undefined;
    latest = undefined;
    submitting = false;
    if (!state.ok || !ready()) return;
    values = draft(state.scope, initial);
    tainted = {};
    errors = {};
    error = null;
  }
  function validationErrors(scope: Scope, submitted: Draft<S, A>): Record<string, string> {
    let result: Record<string, string> = {};
    const custom = options.validate?.(draft(scope, submitted));
    if (custom !== undefined && custom !== null) {
      const checked = snapshotPlainData(custom);
      if (!checkExact(errorsSchema, checked)) throw new HttpError('Invalid form validator result', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
      result = checked;
    }
    for (const field of contractFormInvalidFields(scope.contract, scope.action, submitted)) {
      if (!result[field]) result = { ...result, [field]: i18n.t('validation.invalidFormat') };
    }
    return result;
  }
  function validate(scope: Scope, submitted: Draft<S, A>, current: () => boolean): unknown {
    const checked = validationErrors(scope, submitted);
    if (!current()) throw cancelled();
    errors = checked;
    if (Object.keys(errors).length) throw new HttpError('Invalid form input', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
    return scope.action === 'edit' ? parseContractUpdateInput(scope.contract, submitted) : parseContractCreateInput(scope.contract, submitted);
  }
  function validateFields(fields?: readonly Field<S, A>[]): boolean {
    if (!state.ok || !isCurrent(state.scope) || hydratedKey !== state.scope.key || submitting || state.scope.action === 'show') return false;
    const scope = state.scope;
    const revision = draftRevision;
    const current = () => isCurrent(scope) && revision === draftRevision;
    try {
      const names: readonly string[] = getContractFormFields(state.scope.contract, state.scope.action);
      const selected = snapshotPlainData(fields ?? names);
      if (!checkExact(Type.Array(Type.String()), selected) || selected.some(field => !names.includes(field))) {
        throw new HttpError('Invalid form fields', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
      }
      const checked = validationErrors(scope, draft(scope, values));
      if (!current()) return false;
      errors = Object.fromEntries(Object.entries(checked).filter(([field]) => selected.includes(field) || field === '_root'));
      error = null;
      return Object.keys(errors).length === 0;
    } catch (cause) {
      if (current()) error = failure(cause);
      return false;
    }
  }
  async function refresh(scope: Scope, ids: readonly (string | number)[]) {
    const owned = {
      client, matcher: { ...scope.matcher, resource: scope.contract.name },
      owner: { source: scope.source, authSession: scope.authScope.cacheKey },
      current: () => sessionCurrent(scope),
    };
    await Promise.allSettled([
      invalidateOwnedQueries({ ...owned, scopes: ['list', 'many'] }),
      ...ids.map(id => invalidateOwnedQueries({ ...owned, scopes: ['detail'], id })),
    ]);
  }
  function redirect(scope: Scope, to: Redirect, id: string | number, current: () => boolean) {
    if (!to || !current() || isTainted()) return;
    const base = `/${encodeURIComponent(scope.contract.name)}`;
    const target = to === 'list' ? base : `${base}/${to}/${encodeURIComponent(formatContractRouteId(scope.contract, parseContractId(scope.contract, id)))}`;
    notify(() => {
      const path = appendListQueryFromPath(target, context.currentPath());
      if (current() && !isTainted()) return context.navigate(path);
    }, undefined);
  }
  function submit(overrides: { redirect?: Redirect } = {}): Promise<{ data: ContractRecord<S> }> {
    function joined(operation: NonNullable<typeof active>) {
      const current = () => isCurrent(operation.scope) && latest === operation.token;
      return operation.promise.then(result => {
        if (!current()) throw cancelled(operation.wasDispatched());
        return { data: parseContractRecord(operation.scope.contract, result.data) };
      }, (cause: unknown) => {
        if (!current()) throw cancelled(operation.wasDispatched());
        throw cause instanceof HttpError ? copyFailure(cause) : failure(cause, operation.wasDispatched());
      });
    }
    const origin = state.ok ? state.scope : undefined;
    if (origin && !isCurrent(origin)) {
      latest = undefined;
      return Promise.reject(cancelled());
    }
    let input: { redirect?: Redirect };
    try {
      const checked = snapshotPlainData(overrides);
      if (!checkExact(submitSchema, checked)) throw new HttpError('Invalid form input', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
      input = checked;
    } catch (cause) {
      const rejected = failure(cause);
      if (!active) latest = undefined;
      error = rejected;
      notify(options.onMutationError, copyFailure(rejected));
      if (origin && !isCurrent(origin)) return Promise.reject(cancelled());
      return Promise.reject(copyFailure(rejected));
    }
    if (active && isCurrent(active.scope)) return joined(active);
    const token = {};
    latest = token;
    let dispatched = false;
    let scope: Scope;
    let submitted: Draft<S, A>;
    let payload: unknown;
    let destination: Redirect;
    let suppliedId: string | number | undefined;
    const onSuccess = options.onMutationSuccess;
    const onError = options.onMutationError;
    try {
      if (!state.ok) throw state.error;
      scope = state.scope;
      if (!isCurrent(scope)) return Promise.reject(cancelled());
      if (scope.action === 'show' || hydratedKey !== scope.key) throw new HttpError('Form is not writable', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
      destination = input.redirect ?? options.redirect ?? (scope.action === 'edit' ? adminOptions.redirect?.afterEdit
        : scope.action === 'clone' ? adminOptions.redirect?.afterClone : adminOptions.redirect?.afterCreate) ?? 'list';
      if (![false, 'list', 'edit', 'show'].includes(destination)) throw new HttpError('Invalid redirect', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
      submitted = draft(scope, values);
      const captured = scope;
      const revision = draftRevision;
      payload = validate(scope, submitted, () => latest === token && isCurrent(captured) && revision === draftRevision);
      if (scope.action === 'edit' && scope.id !== undefined) validateUpdateIdentity(payload, scope.id);
      if (scope.action !== 'edit') suppliedId = createInputId(scope.contract, payload);
    } catch (cause) {
      if (latest !== token || (origin && !isCurrent(origin)) || (cause instanceof HttpError && cause.code === 'FORM_CANCELLED')) {
        return Promise.reject(cancelled());
      }
      const rejected = failure(cause);
      error = rejected;
      notify(onError, copyFailure(rejected));
      if (latest !== token || (origin && !isCurrent(origin))) return Promise.reject(cancelled());
      return Promise.reject(copyFailure(rejected));
    }
    const target = scope;
    const source = submitted;
    const current = () => isCurrent(target) && latest === token;
    if (!current()) return Promise.reject(cancelled());
    submitting = true;
    error = null;
    const promise = Promise.resolve().then(async () => {
      let record: ContractRecord<S> | undefined;
      let rejected: { cause: unknown; error: HttpError } | undefined;
      let resultId: string | number | undefined;
      const refreshIds: (string | number)[] = target.action === 'edit' && target.id !== undefined
        ? [target.id] : suppliedId === undefined ? [] : [suppliedId];
      try {
        if (!isCurrent(target) || active?.token !== token) throw cancelled();
        const request = { resource: target.contract.name, variables: snapshotPlainData(payload),
          ...definedOptions({ meta: target.meta === undefined ? undefined : decodeBaseRecord(snapshotPlainData(target.meta)) }) };
        dispatched = true;
        const response = target.action === 'edit' && target.id !== undefined
          ? await target.update({ ...request, id: target.id }) : await target.create(request);
        if (!sessionCurrent(target)) throw cancelled(dispatched);
        try {
          record = decodeOneResult(snapshotPlainData(response), value => parseContractRecord(target.contract, value), true).data;
          resultId = parseContractId(target.contract, record.id);
          if (resultId === undefined) return rejectProviderResponse(true);
          if (target.action === 'edit' && resultId !== target.id) rejectProviderResponse(true);
          if (target.action !== 'edit' && suppliedId !== undefined && suppliedId !== resultId) rejectProviderResponse(true);
          if (!refreshIds.includes(resultId)) refreshIds.push(resultId);
        } catch { return rejectProviderResponse(true); }
        auditWithProvider({ action: target.action === 'edit' ? 'update' : 'create', resource: target.contract.name,
          recordId: resultId, ...definedOptions({ meta: target.meta }) }, target.auditLogProvider, () => sessionCurrent(target));
        notify(() => { if (sessionCurrent(target)) return target.liveProvider?.publish?.({
          type: target.action === 'edit' ? 'UPDATE' : 'INSERT', resource: target.contract.name, payload: { ids: [resultId] },
        }); }, undefined);
      } catch (cause) {
        rejected = { cause, error: failure(cause, dispatched) };
      } finally {
        if (dispatched && sessionCurrent(target)) await refresh(target, refreshIds);
      }
      if (!isCurrent(target) || active?.token !== token) throw cancelled(dispatched);
      if (rejected) {
        const failed = rejected;
        error = failed.error;
        const fields: readonly string[] = getContractFormFields(target.contract, target.action);
        for (const field of serverErrorFields(failed.cause)) {
          if (fields.includes(field) && JSON.stringify(ownValue(values, field)) === JSON.stringify(ownValue(source, field))) {
            errors = { ...errors, [field]: i18n.t('validation.invalidFormat') };
          }
        }
        notify(async () => { await handleAuthError(copyFailure(failed.error), context,
          () => targetCurrent(target) && latest === token,
          () => clearAuthQueries(client, target.authProvider), target.authScope); }, undefined);
        if (current()) notify(() => fireErrorNotification({ config: undefined, defaultMessage: i18n.t('common.operationFailed'), error: copyFailure(failed.error),
          resource: target.contract.name, ...definedOptions({ provider: target.notificationProvider }) }), undefined);
        if (current()) notify(onError, copyFailure(failed.error));
        throw failed.error;
      }
      if (!record || resultId === undefined) return rejectProviderResponse(true);
      const persisted = recordDraft(target, record);
      const changed = Object.keys(values).filter(key => JSON.stringify(ownValue(values, key)) !== JSON.stringify(ownValue(source, key)));
      for (const key of Object.keys(source)) {
        if (!Object.hasOwn(values, key) && !changed.includes(key)) changed.push(key);
      }
      const reconciled = Object.fromEntries([
        ...Object.entries(persisted).filter(([key]) => !changed.includes(key)),
        ...Object.entries(values).filter(([key]) => changed.includes(key)),
      ]);
      values = draft(target, reconciled);
      initial = draft(target, persisted);
      tainted = Object.fromEntries(changed.map(key => [key, true]));
      notify(() => fireSuccessNotification({ config: undefined, defaultMessage: i18n.t(target.action === 'edit' ? 'common.updateSuccess' : 'common.createSuccess'),
        resource: target.contract.name, ...definedOptions({ provider: target.notificationProvider }) }), undefined);
      if (current()) notify(onSuccess, { data: parseContractRecord(target.contract, record) });
      if (current()) redirect(target, destination, resultId, current);
      if (!current()) throw cancelled(dispatched);
      return { data: parseContractRecord(target.contract, record) };
    }).finally(() => {
      if (active?.token === token) { active = undefined; submitting = false; }
    });
    active = { token, scope: target, promise, wasDispatched: () => dispatched };
    return joined(active);
  }
  $effect(() => {
    if (!(options.warnWhenUnsavedChanges ?? adminOptions.warnWhenUnsavedChanges) || !isTainted() || !enabled() || typeof window === 'undefined') return;
    const scope = state.ok ? state.scope : undefined;
    const handler = (event: BeforeUnloadEvent) => {
      if (!scope || !isCurrent(scope) || !isTainted()) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  });
  return {
    get values(): Readonly<Draft<S, A>> {
      return state.ok && isCurrent(state.scope) && hydratedKey === state.scope.key
        ? draft(state.scope, values) : snapshotContractFormDraft(options.resource, options.action, {});
    },
    setValues, setFieldValue, reset, submit, validateFields,
    get errors(): Readonly<Record<string, string>> { return ready() ? { ...errors } : {}; },
    setFieldError(field: Field<S, A> | '_root', message: string) {
      if (!ready()) return;
      const names: readonly string[] = getContractFormFields(options.resource, options.action);
      if (typeof field !== 'string' || (field !== '_root' && !names.includes(field)) || typeof message !== 'string') {
        throw new HttpError('Invalid form error', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
      }
      errors = { ...errors, [field]: message };
    },
    clearFieldError(field: string) { if (ready()) errors = Object.fromEntries(Object.entries(errors).filter(([key]) => key !== field)); },
    clearErrors() { if (ready()) errors = {}; },
    get tainted(): Readonly<Record<string, boolean>> { return ready() ? { ...tainted } : {}; }, isTainted, untaint() { if (ready()) tainted = {}; },
    get isDirty() { return isTainted(); },
    get submitting() { return ready() && submitting; },
    get loading() { return state.ok && isCurrent(state.scope) && state.scope.action !== 'create' && !(currentQuery()?.isSuccess || currentQuery()?.isError); },
    get error() { return !state.ok ? copyFailure(state.error) : !isCurrent(state.scope) ? null
      : error && ready() ? copyFailure(error) : currentQuery()?.isError ? failure(query.error) : null; },
    get ready() { return ready(); },
    get id() { return state.ok ? state.scope.id : undefined; },
    get action() { return options.action; },
    get resource() { return options.resource.name; },
    query: {
      get data() { return checkedQueryData(); },
      get error() { return currentQuery()?.isError ? failure(query.error) : null; },
      get isPending() { return currentQuery()?.isPending ?? true; },
      get isError() { return currentQuery()?.isError ?? false; },
      get isSuccess() { return currentQuery()?.isSuccess ?? false; },
      get refetch() {
        const scope = state.ok ? state.scope : undefined;
        return async () => {
          if (!scope || !isCurrent(scope) || scope.action === 'create') throw cancelled();
          await tick();
          if (!isCurrent(scope)) throw cancelled();
          await query.refetch();
          if (!isCurrent(scope)) throw cancelled();
          return { data: checkedQueryData(), error: currentQuery()?.isError ? failure(query.error) : null };
        };
      },
    },
  };

  function checkedQueryData() {
    if (!state.ok || !currentQuery()?.isSuccess || !query.isSuccess) return undefined;
    return { data: parseContractRecord(state.scope.contract, query.data.data) };
  }
}
