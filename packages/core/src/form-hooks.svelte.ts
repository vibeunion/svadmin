import { useQueryClient } from '@tanstack/svelte-query';
import { useParsed } from './useParsed.svelte';
import { getAdminOptions } from './options.svelte';
import { captureAdminContext } from './context.svelte';
import { queryKeyMatches } from './query-keys';
import { createQuery, createMutation } from '@tanstack/svelte-query';
import { notifyWithProvider } from './notification.svelte';
import type { NotificationParams } from './notification.svelte';
import { useTranslation } from './i18n.svelte';
import { auditWithProvider } from './audit';
import type { AuditEntry } from './audit';
import { HttpError, UndoError } from './types';
import type { BaseRecord, MutationMode, KnownResources } from './types';
import { checkError } from './hook-utils.svelte';
import { toast } from './toast.svelte';
import { deepMerge, invalidateByScopes } from './mutation-hooks.svelte';

// ─── Types ───────────────────────────────────────────────────────────

export interface UseFormOptions<
  TVariables extends Record<string, unknown> = Record<string, unknown>,
  _TData extends BaseRecord = BaseRecord,
  _TError = HttpError,
> {
  resource?: KnownResources;
  action?: 'create' | 'edit' | 'clone' | 'show';
  id?: string | number;
  redirect?: 'list' | 'edit' | 'show' | false;

  /** Initial values for the form. Merged with query data in edit mode (query wins). */
  defaultValues?: TVariables;

  // ─── Validation ───────────────────────────────────────────────
  /** Full-form validator. Returns field→error map or null. */
  validate?: (values: TVariables) => Record<string, string> | null;
  /** Per-field validator for real-time validation. */
  validateField?: (field: string, value: unknown, values: TVariables) => string | null;

  // ─── Notifications ────────────────────────────────────────────
  successNotification?: string | false;
  errorNotification?: string | false;

  // ─── Callbacks ────────────────────────────────────────────────
  onMutationSuccess?: (data: unknown) => void;
  onMutationError?: (error: Error) => void;
  /** Called every time a field value changes. */
  onChange?: (event: { field: string; value: unknown; values: TVariables }) => void;
  /** Called before mutation. Return false or call cancel() to prevent submission. */
  onSubmit?: (ctx: { values: TVariables; action: 'create' | 'edit' | 'clone' | 'show'; cancel: () => void }) => boolean | undefined;

  // ─── Meta ─────────────────────────────────────────────────────
  meta?: Record<string, unknown>;
  queryMeta?: Record<string, unknown>;
  mutationMeta?: Record<string, unknown>;

  // ─── Server validation ────────────────────────────────────────
  disableServerSideValidation?: boolean;

  // ─── AutoSave ─────────────────────────────────────────────────
  autoSave?: {
    enabled: boolean;
    debounce?: number;
    onFinish?: (values: TVariables) => TVariables;
    invalidateOnUnmount?: boolean;
    invalidates?: string[];
  };

  // ─── Mutation behavior ────────────────────────────────────────
  mutationMode?: MutationMode;
  undoableTimeout?: number;
  invalidates?: string[] | false;
  optimisticUpdateMap?: {
    list?: boolean | ((previous: unknown, variables: TVariables, id?: string | number) => unknown);
    detail?: boolean | ((previous: unknown, variables: TVariables, id?: string | number) => unknown);
  };

  // ─── Query config ─────────────────────────────────────────────
  queryOptions?: { staleTime?: number; enabled?: boolean };
  createMutationOptions?: Record<string, unknown>;
  updateMutationOptions?: Record<string, unknown>;

  /** DataProvider to use for this form */
  dataProviderName?: string;

  warnWhenUnsavedChanges?: boolean;
}

export interface UseFormReturn<
  TVariables extends Record<string, unknown> = Record<string, unknown>,
  _TData extends BaseRecord = BaseRecord,
> {
  // ─── Form values (single source of truth) ─────────────────────
  /** Reactive form values. Read/write directly. */
  readonly values: TVariables;
  /** Set a single field value. Tracks tainted state and fires onChange. */
  setFieldValue: (field: string, value: unknown, opts?: { taint?: boolean }) => void;
  /** Bulk-set multiple field values. */
  setValues: (newValues: Partial<TVariables>, opts?: { taint?: boolean }) => void;

  // ─── Tainted (dirty) ──────────────────────────────────────────
  readonly tainted: Record<string, boolean>;
  isTainted: (field?: string) => boolean;
  untaint: () => void;

  // ─── Errors ───────────────────────────────────────────────────
  readonly errors: Record<string, string>;
  setFieldError: (field: string, message: string) => void;
  clearFieldError: (field: string) => void;
  clearErrors: () => void;
  /** Validate a single field. Sets/clears the field error. Returns the error or null. */
  validateField: (field: string) => string | null;

  // ─── Submission ───────────────────────────────────────────────
  /** Submit the form. Validates → onSubmit hook → mutation → redirect. */
  submit: (overrides?: { redirect?: 'list' | 'edit' | 'show' | false }) => Promise<void>;
  /** Reset form to initial/query values. Clears tainted and errors. */
  reset: () => void;

  // ─── State ──────────────────────────────────────────────────────
  readonly loading: boolean;
  readonly submitting: boolean;
  readonly action: 'create' | 'edit' | 'clone' | 'show';
  readonly resource: string;
  readonly id: string | number | undefined;
  readonly isDirty: boolean;
  setId: (id: string | number | undefined) => void;
  setAction: (action: 'create' | 'edit' | 'clone' | 'show') => void;
  mutationMode: MutationMode;
  redirect: (to: 'list' | 'edit' | 'show' | false) => void;

  // ─── AutoSave ─────────────────────────────────────────────────
  triggerAutoSave: () => void;
  readonly autoSave: { status: 'idle' | 'saving' | 'saved' | 'error'; data: unknown; error: unknown };

  // ─── Raw query/mutation (escape hatch) ────────────────────────
  readonly query: unknown;
  readonly mutation: unknown;
}

interface FormRecordIdentity {
  generation: number;
  resource: string;
  action: 'create' | 'edit' | 'clone' | 'show';
  id: string | number | undefined;
}

// ─── Implementation ──────────────────────────────────────────────────

export function useForm<
  TVariables extends Record<string, unknown> = Record<string, unknown>,
  TData extends BaseRecord = BaseRecord,
  TError = HttpError,
>(options: UseFormOptions<TVariables, TData, TError> = {} as UseFormOptions<TVariables, TData, TError>): UseFormReturn<TVariables, TData> {
  const adminContext = captureAdminContext();
  const i18n = useTranslation();
  const queryClient = useQueryClient();
  const parsed = useParsed();
  const adminOptions = getAdminOptions();
  const sendNotification = (params: NotificationParams) =>
    notifyWithProvider(params, adminContext.notificationProvider);
  const recordAudit = (entry: Omit<AuditEntry, 'timestamp'>) =>
    auditWithProvider(entry, adminContext.auditLogProvider);

  const resource = $derived(options.resource ?? parsed.resource ?? '');
  let action = $state<'create' | 'edit' | 'clone' | 'show'>(options.action ?? (parsed.action === 'list' ? 'create' : parsed.action as 'create' | 'edit' | 'clone' | 'show') ?? 'create');
  let currentId = $state<string | number | undefined>(options.id ?? parsed.id);

  const defaultRedirectOpt = $derived(action === 'clone' ? adminOptions.redirect?.afterClone : action === 'edit' ? adminOptions.redirect?.afterEdit : adminOptions.redirect?.afterCreate);
  const {
    redirect: redirectOption,
    successNotification, errorNotification,
    onMutationSuccess, onMutationError,
    meta: hookMeta, queryMeta: hookQueryMeta, mutationMeta: hookMutationMeta,
    disableServerSideValidation, autoSave: autoSaveOpts,
    mutationMode = adminOptions.mutationMode ?? 'pessimistic',
    undoableTimeout = adminOptions.undoableTimeout ?? 5000,
    dataProviderName, invalidates: invalidateScopes,
    optimisticUpdateMap,
    queryOptions,
    onChange: onChangeFn,
    onSubmit: onSubmitFn,
  } = options;
  // Reactive redirect: uses $derived `defaultRedirectOpt` so redirect target
  // updates when `action` changes at runtime (e.g., via `setAction`).
  const redirectDefault = $derived(redirectOption ?? defaultRedirectOpt ?? 'list');

  const provider = $derived(adminContext.getDataProviderForResource(resource, dataProviderName));
  const queryMeta = $derived({ ...useParsed().params, ...hookMeta, ...hookQueryMeta });
  const mutationMeta = $derived({ ...useParsed().params, ...hookMeta, ...hookMutationMeta });

  let recordGeneration = 0;
  let formDestroyed = false;

  function captureRecordIdentity(): FormRecordIdentity {
    return { generation: recordGeneration, resource, action, id: currentId };
  }

  function isRecordIdentityCurrent(identity: FormRecordIdentity): boolean {
    return !formDestroyed
      && identity.generation === recordGeneration
      && identity.resource === resource
      && identity.action === action;
  }

  function invalidateRecordIdentity() {
    recordGeneration += 1;
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    if (autoSaveStatusTimer) {
      clearTimeout(autoSaveStatusTimer);
      autoSaveStatusTimer = null;
    }
    autoSaveDirty = false;
    autoSaveStatus = 'idle';
    lastAutoSaveData = null;
    lastAutoSaveError = null;
    tainted = {};
    clearErrors();
  }

  function setId(newId: string | number | undefined) {
    if (Object.is(currentId, newId)) return;
    invalidateRecordIdentity();
    currentId = newId;
  }

  function setAction(newAction: 'create' | 'edit' | 'clone' | 'show') {
    if (action === newAction) return;
    invalidateRecordIdentity();
    action = newAction;
  }

  // ─── Form values (single source of truth) ───────────────────────
  const defaultValuesSource = (options.defaultValues ?? {}) as TVariables;
  let values = $state<TVariables>(createPersistenceSnapshot(defaultValuesSource));
  let initialValues = createPersistenceSnapshot(defaultValuesSource);

  function setFieldValue(field: string, value: unknown, opts?: { taint?: boolean }) {
    values = { ...values, [field]: value } as TVariables;
    const shouldTaint = opts?.taint ?? true;
    if (shouldTaint) tainted = { ...tainted, [field]: true };
    // Clear field error on change
    if (errors[field]) clearFieldError(field);
    onChangeFn?.({ field, value, values });
    triggerAutoSave();
  }

  function setValues(newValues: Partial<TVariables>, opts?: { taint?: boolean }) {
    values = { ...values, ...newValues } as TVariables;
    const shouldTaint = opts?.taint ?? true;
    if (shouldTaint) {
      const newTainted = { ...tainted };
      for (const key of Object.keys(newValues)) newTainted[key] = true;
      tainted = newTainted;
    }
    triggerAutoSave();
  }

  // ─── Tainted (dirty) state ──────────────────────────────────────
  let tainted = $state<Record<string, boolean>>({});

  function isTainted(field?: string): boolean {
    if (field !== undefined) return !!tainted[field];
    return Object.values(tainted).some(Boolean);
  }

  function isPlainObject(value: object): boolean {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function isFormData(value: object): value is FormData {
    return typeof FormData !== 'undefined' && value instanceof FormData;
  }

  function readOwnValue(value: object, key: PropertyKey): unknown {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) return undefined;
    return 'value' in descriptor ? descriptor.value : Reflect.get(value, key);
  }

  function snapshotPersistenceValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
    if (value === null || typeof value !== 'object') return value;

    const existing = seen.get(value);
    if (existing !== undefined) return existing;

    if (value instanceof Date) {
      const snapshot = new Date(value.getTime());
      seen.set(value, snapshot);
      return snapshot;
    }

    if (isFormData(value)) {
      const snapshot = new FormData();
      seen.set(value, snapshot);
      for (const [key, entry] of value.entries()) snapshot.append(key, entry);
      return snapshot;
    }

    if (Array.isArray(value)) {
      const snapshot = new Array<unknown>(value.length);
      seen.set(value, snapshot);
      for (let index = 0; index < value.length; index += 1) {
        if (index in value) snapshot[index] = snapshotPersistenceValue(readOwnValue(value, String(index)), seen);
      }
      return snapshot;
    }

    if (!isPlainObject(value)) return value;

    const snapshot = Object.create(Object.getPrototypeOf(value)) as Record<PropertyKey, unknown>;
    seen.set(value, snapshot);
    for (const key of Reflect.ownKeys(value)) {
      if (!Object.prototype.propertyIsEnumerable.call(value, key)) continue;
      snapshot[key] = snapshotPersistenceValue(readOwnValue(value, key), seen);
    }
    return snapshot;
  }

  function createPersistenceSnapshot(source: TVariables): TVariables {
    return snapshotPersistenceValue(source, new WeakMap<object, unknown>()) as TVariables;
  }

  function enumerableOwnKeys(value: object): PropertyKey[] {
    return Reflect.ownKeys(value).filter((key) => Object.prototype.propertyIsEnumerable.call(value, key));
  }

  function persistenceValuesEqual(
    left: unknown,
    right: unknown,
    leftToRight: WeakMap<object, object> = new WeakMap<object, object>(),
    rightToLeft: WeakMap<object, object> = new WeakMap<object, object>(),
  ): boolean {
    if (Object.is(left, right)) return true;
    if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;

    const leftIsDate = left instanceof Date;
    if (leftIsDate || right instanceof Date) {
      return leftIsDate && right instanceof Date && Object.is(left.getTime(), right.getTime());
    }

    const leftIsFormData = isFormData(left);
    if (leftIsFormData || isFormData(right)) {
      if (!leftIsFormData || !isFormData(right)) return false;
      const leftEntries = Array.from(left.entries());
      const rightEntries = Array.from(right.entries());
      if (leftEntries.length !== rightEntries.length) return false;
      return leftEntries.every(([leftKey, leftValue], index) => {
        const rightEntry = rightEntries[index];
        return rightEntry !== undefined
          && leftKey === rightEntry[0]
          && persistenceValuesEqual(leftValue, rightEntry[1], leftToRight, rightToLeft);
      });
    }

    const leftIsArray = Array.isArray(left);
    if (leftIsArray !== Array.isArray(right)) return false;
    if (!leftIsArray && (!isPlainObject(left) || !isPlainObject(right))) return false;
    if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) return false;

    const previousRight = leftToRight.get(left);
    if (previousRight !== undefined) return previousRight === right;
    const previousLeft = rightToLeft.get(right);
    if (previousLeft !== undefined) return previousLeft === left;
    leftToRight.set(left, right);
    rightToLeft.set(right, left);

    if (leftIsArray && left.length !== (right as unknown[]).length) return false;

    const leftKeys = enumerableOwnKeys(left);
    const rightKeys = enumerableOwnKeys(right);
    if (leftKeys.length !== rightKeys.length) return false;

    for (const key of leftKeys) {
      if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
      if (!persistenceValuesEqual(readOwnValue(left, key), readOwnValue(right, key), leftToRight, rightToLeft)) return false;
    }
    return true;
  }

  function reconcilePersistedSnapshot(sourceSnapshot: TVariables, persistedSnapshot: TVariables = sourceSnapshot) {
    const nextInitialValues = createPersistenceSnapshot(persistedSnapshot);
    let nextTainted = { ...tainted };

    for (const field of Object.keys(sourceSnapshot)) {
      if (persistenceValuesEqual(readOwnValue(values, field), readOwnValue(sourceSnapshot, field))) {
        const { [field]: _persistedField, ...remainingTainted } = nextTainted;
        nextTainted = remainingTainted;
      } else {
        nextTainted[field] = true;
      }
    }

    initialValues = nextInitialValues;
    tainted = nextTainted;
  }

  // ─── Errors ─────────────────────────────────────────────────────
  let errors = $state<Record<string, string>>({});

  function setFieldError(field: string, message: string) { errors = { ...errors, [field]: message }; }
  function clearErrors() { errors = {}; }
  function clearFieldError(field: string) {
    const { [field]: _, ...next } = errors;
    errors = next;
  }

  function doValidateField(field: string): string | null {
    const value = values[field];
    if (options.validateField) {
      const msg = options.validateField(field, value, values);
      if (msg) { setFieldError(field, msg); return msg; }
      else { clearFieldError(field); }
    }
    return null;
  }

  function runValidation(): boolean {
    clearErrors();
    const validate = options.validate;
    if (validate) {
      const result = validate(values);
      if (result && Object.keys(result).length > 0) {
        errors = result;
        return false;
      }
    }
    return true;
  }

  // ─── Reset ──────────────────────────────────────────────────────
  function reset() {
    values = createPersistenceSnapshot(initialValues);
    tainted = {};
    clearErrors();
    queryInitializedId = currentId;
  }

  // ─── Server error handling ──────────────────────────────────────

  function handleHttpError(error: Error) {
    checkError(error, adminContext);
    if (error instanceof HttpError && error.errors && !disableServerSideValidation) {
      for (const [field, messages] of Object.entries(error.errors)) {
        const msg = Array.isArray(messages) ? messages[0] : messages;
        setFieldError(field, msg);
      }
      if (errorNotification !== false) sendNotification({ type: 'error', message: typeof errorNotification === 'string' ? errorNotification : (error.message || i18n.t('common.operationFailed')) });
    } else {
      if (errorNotification !== false) sendNotification({ type: 'error', message: typeof errorNotification === 'string' ? errorNotification : (i18n.t('common.operationFailed') + ': ' + error.message) });
    }
  }

  // ─── Query (edit/clone mode) ────────────────────────────────────
  // Always create the query — use `enabled` to conditionally activate.
  // This ensures setAction('edit') at runtime will trigger a fetch.
  const query = createQuery(() => ({
    queryKey: adminContext.queryKeys(resource, options.dataProviderName).data.one(resource, currentId ?? '', {
      meta: queryMeta,
    }),
    queryFn: async () => {
      const result = await provider.getOne<BaseRecord>({ resource, id: currentId as string, meta: queryMeta });
      return result;
    },
    enabled: (queryOptions?.enabled ?? true) && (action === 'edit' || action === 'clone' || action === 'show') && currentId != null,
    staleTime: queryOptions?.staleTime,
  }));

  // Auto-populate values from query data
  let queryInitializedId: string | number | undefined = undefined;
  {
    $effect.pre(() => {
      // Discard previous fetch lock and default when switched strictly back to create
      if (action === 'create' && queryInitializedId !== undefined) {
        queryInitializedId = undefined;
        const def = (options.defaultValues ?? {}) as TVariables;
        values = createPersistenceSnapshot(def);
        initialValues = createPersistenceSnapshot(def);
        tainted = {};
        clearErrors();
        return;
      }
      if (queryInitializedId === currentId) return;
      const record = (query.data as { data: Record<string, unknown> } | undefined)?.data;
      const pk = adminContext.getResource(resource).primaryKey ?? 'id';
      if (record && String(record[pk]) === String(currentId)) {
        const cloneStripKeys = new Set(['id', '_id', pk, 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'createdBy', 'updated_by', 'created_by', 'updatedBy']);
        const targetData = action === 'clone' 
          ? Object.fromEntries(Object.entries(record).filter(([k]) => !cloneStripKeys.has(k)))
          : record;
        // Merge: defaultValues < query data
        const merged = { ...(options.defaultValues ?? {}), ...targetData } as TVariables;
        values = createPersistenceSnapshot(merged);
        initialValues = createPersistenceSnapshot(merged);
        tainted = {};
        clearErrors();
        queryInitializedId = currentId;
      }
    });
  }

  // ─── Mutations ──────────────────────────────────────────────────
  let redirectOverride: 'list' | 'edit' | 'show' | false | undefined;
  let manualSubmitInProgress = false;
  let manualSubmitIdentity: FormRecordIdentity | null = null;

  function isManualSubmitIdentityCurrent(): boolean {
    if (formDestroyed) return false;
    return !manualSubmitInProgress
      || manualSubmitIdentity == null
      || isRecordIdentityCurrent(manualSubmitIdentity);
  }

  const createMut = createMutation(() => ({
    ...options.createMutationOptions,
    mutationFn: (variables: unknown) => {
      const targetResource = resource;
      const targetMeta = mutationMeta;
      return provider.create<TData, TVariables>({ resource: targetResource, variables: variables as TVariables, meta: targetMeta });
    },
    onMutate: async () => {
      return { targetResource: resource };
    },
    onSuccess: (data: { data: TData }, _vars: unknown, context: unknown) => {
      const ctx = context as { targetResource?: string } | undefined;
      const res = ctx?.targetResource ?? resource;
      invalidateByScopes({
        queryClient,
        resource: res,
        scopes: invalidateScopes,
        defaults: ['list', 'many'],
        matcher: adminContext.queryKeyMatcher(res, options.dataProviderName),
      });
      if (!isManualSubmitIdentityCurrent()) return;
      if (successNotification !== false) sendNotification({ type: 'success', message: typeof successNotification === 'string' ? successNotification : i18n.t('common.createSuccess') });
      const pk = adminContext.getResource(res).primaryKey ?? 'id';
      const newId = (data.data as Record<string, unknown>)[pk];
      recordAudit({
        action: 'create',
        resource: res,
        recordId: String(newId),
        meta: adminContext.getProviderMeta(res),
      });
      try {
        const lp = adminContext.liveProvider;
        if (lp?.publish) lp.publish({ type: 'INSERT', resource: res, payload: { ids: newId != null ? [newId as string | number] : [] } });
      } catch { /* no live provider */ }
      onMutationSuccess?.(data);
      if (!manualSubmitInProgress && redirectOverride !== false) {
        if (newId != null) currentId = newId as string | number;
        doRedirect(redirectOverride ?? redirectDefault);
      } else if (manualSubmitInProgress && redirectOverride !== false && newId != null) {
        currentId = newId as string | number;
      }
    },
    onError: (error: Error) => {
      if (!isManualSubmitIdentityCurrent()) return;
      handleHttpError(error);
      onMutationError?.(error);
    },
  }));

  const updateMut = createMutation<{ data: TData }, unknown, TVariables>(() => ({
    ...options.updateMutationOptions,
    mutationFn: async (variables: TVariables) => {
      const targetId = currentId as string;
      const targetResource = resource;
      const targetMeta = mutationMeta;
      if (mutationMode === 'undoable') {
        await new Promise<void>((resolve, reject) => {
          toast.undoable(i18n.t('common.actionCanBeUndone'), undoableTimeout, () => {
            reject(new UndoError());
          }, resolve);
        });
      }
      return provider.update<TData, TVariables>({ resource: targetResource, id: targetId, variables, meta: targetMeta });
    },
    onMutate: async (variables: TVariables) => {
      if (mutationMode === 'pessimistic') return { targetId: currentId, targetResource: resource };
      const targetId = currentId;
      const targetResource = resource;
      const matcher = adminContext.queryKeyMatcher(resource, options.dataProviderName);
      const dataMatch = (queryKey: readonly unknown[], fields: { action?: string; id?: string | number } = {}) => queryKeyMatches(queryKey, {
        ...matcher,
        kind: 'data',
        resource,
        ...fields,
      });
      await queryClient.cancelQueries({ predicate: (q) => dataMatch(q.queryKey) });
      const previousQueries = queryClient.getQueriesData({ predicate: (q) => dataMatch(q.queryKey) });
      if (optimisticUpdateMap?.list !== false) {
        queryClient.setQueriesData({ predicate: (q) => dataMatch(q.queryKey, { action: 'list' }) }, (old: unknown) => {
          if (!old || typeof old !== 'object' || !('data' in old)) return old;
          const o = old as { data: Record<string, unknown>[] };
          const pk = adminContext.getResource(resource).primaryKey ?? 'id';
          return { ...o, data: o.data.map((item) => String(item[pk]) === String(targetId) ? deepMerge(item, variables) : item) };
        });
      }
      if (optimisticUpdateMap?.detail !== false && targetId != null) {
        queryClient.setQueriesData({ predicate: (q) => dataMatch(q.queryKey, { action: 'one', id: targetId }) }, (old: Record<string, unknown> | undefined) => old ? { ...old, data: deepMerge((old as Record<string, unknown>).data || {}, variables) } : old);
      }
      return { previousQueries, targetId, targetResource };
    },
    onSuccess: (data: unknown, _vars: unknown, context: unknown) => {
      const ctx = context as { targetId?: string | number; targetResource?: string } | undefined;
      const targetId = ctx?.targetId ?? currentId;
      const res = ctx?.targetResource ?? resource;
      if (!isManualSubmitIdentityCurrent()) return;
      if (successNotification !== false) sendNotification({ type: 'success', message: typeof successNotification === 'string' ? successNotification : i18n.t('common.updateSuccess') });
      recordAudit({
        action: 'update',
        resource: res,
        recordId: String(targetId),
        meta: adminContext.getProviderMeta(res),
      });
      try {
        const lp = adminContext.liveProvider;
        if (lp?.publish) lp.publish({ type: 'UPDATE', resource: res, payload: { ids: targetId != null ? [targetId] : [] } });
      } catch { /* no live provider */ }
      onMutationSuccess?.(data);
      if (!manualSubmitInProgress && redirectOverride !== false) doRedirect(redirectOverride ?? redirectDefault);
    },
    onSettled: (_data: unknown, error: unknown, _vars: unknown, context: unknown) => {
      if (error instanceof UndoError) return;
      const ctx = context as { targetId?: string | number; targetResource?: string } | undefined;
      const targetId = ctx?.targetId ?? currentId;
      const res = ctx?.targetResource ?? resource;
      invalidateByScopes({
        queryClient,
        resource: res,
        scopes: invalidateScopes,
        defaults: ['list', 'many', 'detail'],
        id: targetId ?? undefined,
        matcher: adminContext.queryKeyMatcher(res, options.dataProviderName),
      });
    },
    onError: (error: unknown, _vars: unknown, context: unknown) => {
      const ctx = context as { previousQueries?: [unknown, unknown][] } | undefined;
      if (ctx?.previousQueries) {
        for (const [queryKey, data] of ctx.previousQueries) {
          queryClient.setQueryData(queryKey as string[], data);
        }
      }
      if (error instanceof UndoError) return;
      if (!isManualSubmitIdentityCurrent()) return;
      handleHttpError(error as Error);
      onMutationError?.(error as Error);
    },
  }));

  function doRedirect(to: 'list' | 'edit' | 'show' | false) {
    const path = adminContext.currentPath().split('?')[0];
    const parts = path.split('/');
    const resIdx = parts.lastIndexOf(String(resource));
    const base = resIdx >= 0 ? parts.slice(0, resIdx + 1).join('/') : `/${resource}`;

    if (to === 'list') void adminContext.navigate(base);
    else if (to === 'edit' && currentId) void adminContext.navigate(`${base}/edit/${currentId}`);
    else if (to === 'show' && currentId) void adminContext.navigate(`${base}/show/${currentId}`);
  }

  // ─── Submit ─────────────────────────────────────────────────────
  async function submit(overrides?: { redirect?: 'list' | 'edit' | 'show' | false }) {
    if (formDestroyed) return;
    const submitIdentity = captureRecordIdentity();
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }
    while (autoSaveInProgress) {
      await new Promise(r => setTimeout(r, 50));
      if (formDestroyed) return;
    }
    if (!isRecordIdentityCurrent(submitIdentity)) return;
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }
    autoSaveDirty = false;
    manualSubmitInProgress = true;
    manualSubmitIdentity = submitIdentity;
    redirectOverride = overrides?.redirect;
    try {
      if (onSubmitFn) {
        let cancelled = false;
        const result = await onSubmitFn({ values, action, cancel: () => { cancelled = true; } });
        if (result === false || cancelled) return;
      }

      if (!isRecordIdentityCurrent(submitIdentity)) return;

      if (!runValidation()) { sendNotification({ type: 'warning', message: i18n.t('validation.required') }); return; }

      const submittedValues = createPersistenceSnapshot(values);
      if (action === 'create' || action === 'clone') await createMut.mutateAsync(submittedValues);
      else await updateMut.mutateAsync(submittedValues);

      if (!isRecordIdentityCurrent(submitIdentity)) return;
      reconcilePersistedSnapshot(submittedValues);
      if (!isTainted() && redirectOverride !== false) doRedirect(redirectOverride ?? redirectDefault);
    } catch {
      // Errors already handled by mutation's onError callback
    } finally {
      manualSubmitInProgress = false;
      manualSubmitIdentity = null;
      redirectOverride = undefined;
      const shouldAutoSave = !formDestroyed && autoSaveDirty && isTainted();
      autoSaveDirty = false;
      if (shouldAutoSave) deferAutoSaveTrigger();
    }
  }

  // ─── AutoSave ───────────────────────────────────────────────────
  let autoSaveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let autoSaveStatusTimer: ReturnType<typeof setTimeout> | null = null;
  let autoSaveInProgress = $state(false);
  let autoSaveDirty = false;
  let lastAutoSaveData = $state<unknown>(null);
  let lastAutoSaveError = $state<unknown>(null);

  $effect(() => {
    return () => {
      formDestroyed = true;
      autoSaveDirty = false;
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
      }
      if (autoSaveStatusTimer) {
        clearTimeout(autoSaveStatusTimer);
        autoSaveStatusTimer = null;
      }
    };
  });

  function deferAutoSaveTrigger() {
    if (formDestroyed) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      if (formDestroyed) return;
      triggerAutoSave();
    }, 0);
  }

  function triggerAutoSave() {
    if (formDestroyed) return;
    const currentAction = action;
    if (!autoSaveOpts?.enabled || currentAction === 'create' || currentAction === 'clone' || currentId == null) return;
    if (autoSaveInProgress || manualSubmitInProgress || createMut.isPending || updateMut.isPending) {
      autoSaveDirty = true;
      return;
    }
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    const scheduledIdentity = captureRecordIdentity();
    const currentSnapshot = createPersistenceSnapshot(values);
    const safeId = scheduledIdentity.id;
    const safeResource = scheduledIdentity.resource;
    const safeMeta = mutationMeta;
    autoSaveTimer = setTimeout(async () => {
      autoSaveTimer = null;
      if (formDestroyed) return;
      if (!isRecordIdentityCurrent(scheduledIdentity)) return;
      if (autoSaveInProgress || manualSubmitInProgress || createMut.isPending || updateMut.isPending) {
        autoSaveDirty = true;
        return;
      }
      const finishedValues = autoSaveOpts.onFinish ? autoSaveOpts.onFinish(currentSnapshot) : currentSnapshot;
      const submittedValues = createPersistenceSnapshot(finishedValues);
      if (autoSaveStatusTimer) {
        clearTimeout(autoSaveStatusTimer);
        autoSaveStatusTimer = null;
      }
      autoSaveStatus = 'saving';
      autoSaveInProgress = true;
      autoSaveDirty = false;
      try {
        await provider.update<TData, TVariables>({ resource: safeResource, id: safeId as string | number, variables: submittedValues, meta: safeMeta });
        if (formDestroyed) return;
        const scopes = autoSaveOpts.invalidates ?? ['resourceAll'];
        invalidateByScopes({
          queryClient,
          resource: safeResource,
          scopes,
          defaults: ['resourceAll'],
          id: safeId ?? undefined,
          matcher: adminContext.queryKeyMatcher(safeResource, options.dataProviderName),
        });
        if (!isRecordIdentityCurrent(scheduledIdentity)) return;
        autoSaveStatus = 'saved';
        lastAutoSaveData = submittedValues;
        lastAutoSaveError = null;
        reconcilePersistedSnapshot(currentSnapshot, submittedValues);
        autoSaveStatusTimer = setTimeout(() => {
          autoSaveStatusTimer = null;
          if (formDestroyed) return;
          autoSaveStatus = 'idle';
        }, 2000);
      } catch (e) {
        if (!isRecordIdentityCurrent(scheduledIdentity)) return;
        autoSaveStatus = 'error';
        lastAutoSaveError = e;
        checkError(e, adminContext);
      } finally {
        if (!formDestroyed) {
          autoSaveInProgress = false;
          const shouldAutoSave = autoSaveDirty && isTainted();
          autoSaveDirty = false;
          if (shouldAutoSave) triggerAutoSave();
        }
      }
    }, autoSaveOpts.debounce ?? 1000);
  }

  if (autoSaveOpts?.invalidateOnUnmount) {
    $effect(() => {
      return () => queryClient.invalidateQueries({
        predicate: (q) => queryKeyMatches(q.queryKey, {
          ...adminContext.queryKeyMatcher(resource, options.dataProviderName),
          kind: 'data',
          resource,
        }),
      });
    });
  }

  // ─── warnWhenUnsavedChanges ─────────────────────────────────────
  const shouldWarn = options.warnWhenUnsavedChanges ?? adminOptions.warnWhenUnsavedChanges;
  if (shouldWarn && typeof window !== 'undefined') {
    $effect(() => {
      if (!isTainted()) return;
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    });
  }

  // ─── Return ─────────────────────────────────────────────────────
  return {
    // Values
    get values() { return values; },
    setFieldValue,
    setValues,

    // Tainted
    get tainted() { return tainted; },
    isTainted,
    untaint: () => { tainted = {}; },

    // Errors
    get errors() { return errors; },
    setFieldError, clearFieldError, clearErrors,
    validateField: doValidateField,

    // Submission
    submit,
    reset,

    // State
    get loading() { return query.isLoading ?? false; },
    get submitting() { return createMut.isPending || updateMut.isPending; },
    get action() { return action; },
    get resource() { return resource; },
    get id() { return currentId; },
    get isDirty() { return Object.keys(tainted).length > 0; },
    setId,
    setAction,
    mutationMode,
    redirect: doRedirect,

    // AutoSave
    triggerAutoSave,
    get autoSave() {
      return {
        status: autoSaveStatus as 'idle' | 'saving' | 'saved' | 'error',
        data: lastAutoSaveData,
        error: lastAutoSaveError,
      };
    },

    // Raw escape hatches
    query,
    get mutation() { return action === 'edit' ? updateMut : createMut; },
  };
}
