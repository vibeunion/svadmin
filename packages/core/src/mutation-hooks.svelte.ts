/* eslint-disable @typescript-eslint/no-explicit-any */
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { getAdminOptions } from './options.svelte';
import { captureAdminContext } from './context.svelte';
import { queryKeyMatchesTenant } from './provider-bundle';
import type { AdminContextAccessor } from './context.svelte';
import { useParsed } from './useParsed.svelte';
import { auditWithProvider } from './audit';
import { UndoError } from './types';
import type { BaseRecord, HttpError, KnownResources } from './types';
import { checkError, createOvertimeTracker, fireSuccessNotification, fireErrorNotification } from './hook-utils.svelte';
import type { NotificationConfig, OvertimeOptions } from './hook-utils.svelte';
import { toast } from './toast.svelte';

// ─── Helper: publish live events after mutations ────────────────

export function publishLiveEvent(
  resource: string,
  type: 'created' | 'updated' | 'deleted',
  ids?: (string | number)[],
  adminContext: AdminContextAccessor = captureAdminContext(),
) {
  try {
    const liveProvider = adminContext.liveProvider;
    if (liveProvider?.publish) {
      liveProvider.publish({
        type: type === 'created' ? 'INSERT' : type === 'updated' ? 'UPDATE' : 'DELETE',
        resource,
        payload: { ids },
      });
    }
  } catch { /* LiveProvider not configured — skip silently */ }
}

/**
 * Invalidate queries by scope. Respects per-mutation `invalidates` override.
 * Default invalidation scopes per operation:
 *   - create: ['list', 'many']
 *   - update: ['list', 'many', 'detail']
 *   - delete: ['list', 'many']
 */
export function invalidateByScopes(
  queryClient: ReturnType<typeof useQueryClient>,
  resource: string,
  scopes: string[] | false | undefined,
  defaults: string[],
  id?: string | number,
  dataProviderName?: string,
  queryMatches: (queryKey: readonly unknown[]) => boolean = () => true,
): void {
  if (scopes === false) return;
  const effectiveScopes = (scopes && scopes.length > 0) ? scopes : defaults;
  const dpMatch = dataProviderName === undefined
    ? (q: { queryKey: readonly unknown[] }) => queryMatches(q.queryKey)
    : (q: { queryKey: readonly unknown[] }) => queryMatches(q.queryKey) && q.queryKey[0] === dataProviderName;
  for (const scope of effectiveScopes) {
    if (scope === 'list') queryClient.invalidateQueries({ predicate: (q) => dpMatch(q) && q.queryKey[1] === resource && (q.queryKey[2] === 'list' || q.queryKey[2] === 'infiniteList' || q.queryKey[2] === 'select' || q.queryKey[2] === 'select-defaults') });
    else if (scope === 'many') queryClient.invalidateQueries({ predicate: (q) => dpMatch(q) && q.queryKey[1] === resource && q.queryKey[2] === 'many' });
    else if ((scope === 'detail' || scope === 'one') && id != null) queryClient.invalidateQueries({ predicate: (q) => dpMatch(q) && q.queryKey[1] === resource && q.queryKey[2] === 'one' && q.queryKey[3] === id });
    else if (scope === 'detail' || scope === 'one') queryClient.invalidateQueries({ predicate: (q) => dpMatch(q) && q.queryKey[1] === resource && q.queryKey[2] === 'one' });
    else if (scope === 'resourceAll') queryClient.invalidateQueries({ predicate: (q) => dpMatch(q) && q.queryKey[1] === resource });
  }
}

export function deepMerge(target: any, source: any): any {
  if (!target || typeof target !== 'object') return source;
  if (!source || typeof source !== 'object') return target;
  if (Array.isArray(source) || source instanceof Date) return source;
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && !(source[key] instanceof Date)) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ─── useCreate ─────────────────────────────────────────────────

interface MutationContext {
  _svadmin_ctx?: boolean;
  userContext?: unknown;
  previousQueries?: [unknown, unknown][];
}

interface MutationCallbacks {
  onMutate?: (variables: unknown) => unknown | Promise<unknown>;
  onSuccess?: (data: unknown, variables: unknown, context: unknown) => void;
  onError?: (error: unknown, variables: unknown, context: unknown) => void;
  onSettled?: (data: unknown | undefined, error: unknown | null, variables: unknown, context: unknown) => void;
}

export interface UseCreateOptions {
  resource?: KnownResources;
  mutationOptions?: MutationCallbacks;
  overtimeOptions?: OvertimeOptions;
}

export interface UseCreateMutateParams<TVariables> {
  resource?: KnownResources;
  variables: TVariables;
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  invalidates?: string[] | false;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
}

export function useCreate<TData extends BaseRecord = BaseRecord, TError = HttpError, TVariables = Record<string, unknown>>(options: UseCreateOptions = {}) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const defaultResource = options.resource ?? parsed.resource ?? '';
  const adminOptions = getAdminOptions();
  const queryClient = useQueryClient();

  const overtime = createOvertimeTracker(() => mutation.isPending, options.overtimeOptions ?? adminOptions.overtime);

  const mutation = createMutation<
    { data: TData },
    TError,
    UseCreateMutateParams<TVariables>
  >(() => ({
    ...options.mutationOptions,
    mutationFn: async (params) => {
      const resName = params.resource ?? defaultResource;
      const provider = adminContext.getDataProviderForResource(resName, params.dataProviderName);
      return await provider.create<TData, TVariables>({
          resource: resName,
          variables: params.variables,
          meta: params.meta,
        });
    },
    onMutate: options.mutationOptions?.onMutate,
    onSuccess: (data, params, context) => {
      const resName = params.resource ?? defaultResource;
      fireSuccessNotification({
        config: params.successNotification,
        defaultMessage: 'Created successfully',
        data: data.data,
        values: params.variables,
        resource: resName,
        provider: adminContext.notificationProvider,
      });
      const res = adminContext.getResource(resName);
      const pk = res.primaryKey ?? 'id';
      const newId = (data.data as Record<string, unknown>)[pk];
      auditWithProvider(
        {
          action: 'create',
          resource: resName,
          recordId: String(newId),
          meta: adminContext.getProviderMeta(resName),
        },
        adminContext.auditLogProvider,
      );
      publishLiveEvent(resName, 'created', newId != null ? [newId as string | number] : undefined, adminContext);
      // Invalidation in onSuccess for create (refine pattern — no optimistic data to reconcile on error)
      invalidateByScopes(
        queryClient,
        resName,
        params.invalidates,
        ['list', 'many'],
        undefined,
        params.dataProviderName,
        (queryKey) => queryKeyMatchesTenant(queryKey, adminContext.tenantCacheKey),
      );
      if (typeof options.mutationOptions?.onSuccess === 'function') {
        (options.mutationOptions.onSuccess as (...a: unknown[]) => unknown)(data, params, context);
      }
    },
    onError: (error, params, context) => {
      checkError(error, adminContext);
      fireErrorNotification({
        config: params.errorNotification,
        defaultMessage: 'Create failed',
        error,
        resource: params.resource ?? defaultResource,
        provider: adminContext.notificationProvider,
      });
      if (typeof options.mutationOptions?.onError === 'function') {
        (options.mutationOptions.onError as (...a: unknown[]) => unknown)(error, params, context);
      }
    },
  }));

  return { mutation, get overtime() { return overtime; } };
}

// ─── useUpdate ─────────────────────────────────────────────────

export interface UseUpdateOptions {
  resource?: KnownResources;
  id?: string | number;
  mutationMode?: 'pessimistic' | 'optimistic' | 'undoable';
  undoableTimeout?: number;
  mutationOptions?: MutationCallbacks;
  overtimeOptions?: OvertimeOptions;
}

export interface UseUpdateMutateParams<TVariables> {
  resource?: KnownResources;
  id?: string | number;
  variables: TVariables;
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  invalidates?: string[] | false;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  onCancel?: () => void;
  optimisticUpdateMap?: {
    detail?: boolean | ((previous: unknown, variables: TVariables, id?: string | number) => unknown);
    list?: boolean | ((previous: unknown, variables: TVariables, id?: string | number) => unknown);
    many?: boolean | ((previous: unknown, variables: TVariables, id?: string | number) => unknown);
  };
}

export function useUpdate<TData extends BaseRecord = BaseRecord, TError = HttpError, TVariables = Record<string, unknown>>(options: UseUpdateOptions = {}) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const defaultResource = options.resource ?? parsed.resource ?? '';
  const defaultId = options.id ?? parsed.id;
  const adminOptions = getAdminOptions();
  const queryClient = useQueryClient();
  const mutationMode = options.mutationMode ?? adminOptions.mutationMode ?? 'pessimistic';
  const undoableTimeout = options.undoableTimeout ?? adminOptions.undoableTimeout ?? 5000;

  const overtime = createOvertimeTracker(() => mutation.isPending, options.overtimeOptions ?? adminOptions.overtime);

  const mutation = createMutation<
    { data: TData },
    TError,
    UseUpdateMutateParams<TVariables>
  >(() => ({
    ...options.mutationOptions,
    mutationFn: async (params) => {
      const resName = params.resource ?? defaultResource;
      const targetId = params.id ?? defaultId;
      if (targetId == null) throw new Error('useUpdate requires an id');

      if (mutationMode === 'undoable') {
        await new Promise<void>((resolve, reject) => {
          toast.undoable('Action can be undone', undoableTimeout, () => {
            params.onCancel?.();
            reject(new UndoError());
          }, resolve);
        });
      }

      const provider = adminContext.getDataProviderForResource(resName, params.dataProviderName);
      return await provider.update<TData, TVariables>({
          resource: resName,
          id: targetId,
          variables: params.variables,
          meta: params.meta,
        });
    },
    onMutate: async (params) => {
      const userOnMutate = options.mutationOptions?.onMutate;
      const userContext = typeof userOnMutate === 'function' ? await userOnMutate(params) : undefined;
      
      if (mutationMode === 'pessimistic') return { _svadmin_ctx: true, userContext };
      const resName = params.resource ?? defaultResource;
      const targetId = params.id ?? defaultId;
      const dpN = params.dataProviderName;
      const dp = (q: { queryKey: readonly unknown[] }) =>
        queryKeyMatchesTenant(q.queryKey, adminContext.tenantCacheKey) && q.queryKey[0] === dpN;
      
      await queryClient.cancelQueries({ predicate: (q) => dp(q) && q.queryKey[1] === resName });

      const previousQueries = queryClient.getQueriesData({ predicate: (q) => dp(q) && q.queryKey[1] === resName });
      
      const pk = adminContext.getResource(resName).primaryKey ?? 'id';
      const updater = params.optimisticUpdateMap ?? { list: true, many: true, detail: true };
      
      if (updater.detail !== false) {
        const detailFn = updater.detail;
        if (typeof detailFn === 'function') {
          queryClient.setQueriesData({ predicate: (q) => dp(q) && q.queryKey[1] === resName && q.queryKey[2] === 'one' && q.queryKey[3] === targetId }, (old: unknown) => detailFn(old, params.variables, targetId));
        } else {
          queryClient.setQueriesData({ predicate: (q) => dp(q) && q.queryKey[1] === resName && q.queryKey[2] === 'one' && q.queryKey[3] === targetId }, (old: Record<string, unknown> | undefined) => old ? { ...old, data: deepMerge((old as Record<string, unknown>).data || {}, params.variables) } : old);
        }
      }
      
      if (updater.list !== false) {
        queryClient.setQueriesData({ predicate: (q) => dp(q) && q.queryKey[1] === resName && q.queryKey[2] === 'list' }, (old: unknown) => {
          if (typeof updater.list === 'function') return updater.list(old, params.variables, targetId);
          if (!old || typeof old !== 'object' || !('data' in old)) return old;
          const o = old as { data: Record<string, unknown>[] };
          return { ...o, data: o.data.map((item) => String(item[pk]) === String(targetId) ? deepMerge(item, params.variables) : item) };
        });
      }

      if (updater.many !== false) {
        queryClient.setQueriesData({ predicate: (q) => dp(q) && q.queryKey[1] === resName && q.queryKey[2] === 'many' }, (old: unknown) => {
          if (typeof updater.many === 'function') return updater.many(old, params.variables, targetId);
          if (!old || typeof old !== 'object' || !('data' in old)) return old;
          const o = old as { data: Record<string, unknown>[] };
          return { ...o, data: o.data.map((item) => String(item[pk]) === String(targetId) ? deepMerge(item, params.variables) : item) };
        });
      }

      return { _svadmin_ctx: true, userContext, previousQueries };
    },
    onSuccess: (data, params, context) => {
      const extractedCtx = (context as MutationContext)?._svadmin_ctx ? (context as MutationContext).userContext : context;
      const resName = params.resource ?? defaultResource;
      const targetId = params.id ?? defaultId;
      fireSuccessNotification({
        config: params.successNotification,
        defaultMessage: 'Updated successfully',
        data: data.data,
        values: params.variables,
        resource: resName,
        provider: adminContext.notificationProvider,
      });
      auditWithProvider(
        {
          action: 'update',
          resource: resName,
          recordId: String(targetId),
          meta: adminContext.getProviderMeta(resName),
        },
        adminContext.auditLogProvider,
      );
      publishLiveEvent(resName, 'updated', targetId != null ? [targetId] : undefined, adminContext);
      if (typeof options.mutationOptions?.onSuccess === 'function') {
        (options.mutationOptions.onSuccess as (...a: unknown[]) => unknown)(data, params, extractedCtx);
      }
    },
    onSettled: (_data, error, params) => {
      if (error instanceof UndoError) return;
      const resName = params.resource ?? defaultResource;
      const targetId = params.id ?? defaultId;
      invalidateByScopes(
        queryClient,
        resName,
        params.invalidates,
        ['list', 'many', 'detail'],
        targetId != null ? targetId : undefined,
        params.dataProviderName,
        (queryKey) => queryKeyMatchesTenant(queryKey, adminContext.tenantCacheKey),
      );
      if (typeof options.mutationOptions?.onSettled === 'function') {
        (options.mutationOptions.onSettled as (...a: unknown[]) => unknown)(_data, error, params, undefined);
      }
    },
    onError: (error, params, context: unknown) => {
      const ctx = context as MutationContext | undefined;
      if (ctx?.previousQueries) {
        for (const [queryKey, data] of ctx.previousQueries) {
          queryClient.setQueryData(queryKey as string[], data);
        }
      }
      if (error instanceof UndoError) return;
      checkError(error, adminContext);
      const extractedCtx = ctx?._svadmin_ctx ? ctx.userContext : context;
      fireErrorNotification({
        config: params.errorNotification,
        defaultMessage: 'Update failed',
        error,
        resource: params.resource ?? defaultResource,
        provider: adminContext.notificationProvider,
      });
      if (typeof options.mutationOptions?.onError === 'function') {
        (options.mutationOptions.onError as (...a: unknown[]) => unknown)(error, params, extractedCtx);
      }
    },
  }));

  return { mutation, get overtime() { return overtime; } };
}

// ─── useDelete ─────────────────────────────────────────────────

export interface UseDeleteOptions {
  resource?: KnownResources;
  id?: string | number;
  mutationMode?: 'pessimistic' | 'optimistic' | 'undoable';
  undoableTimeout?: number;
  mutationOptions?: MutationCallbacks;
  overtimeOptions?: OvertimeOptions;
}

export interface UseDeleteMutateParams<TVariables> {
  resource?: KnownResources;
  id?: string | number;
  variables?: TVariables;
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  invalidates?: string[] | false;
  meta?: Record<string, unknown>;
  dataProviderName?: string;
  onCancel?: () => void;
}

export function useDelete<TData extends BaseRecord = BaseRecord, TError = HttpError, TVariables = Record<string, unknown>>(options: UseDeleteOptions = {}) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const defaultResource = options.resource ?? parsed.resource ?? '';
  const defaultId = options.id ?? parsed.id;
  const adminOptions = getAdminOptions();
  const queryClient = useQueryClient();
  const mutationMode = options.mutationMode ?? adminOptions.mutationMode ?? 'pessimistic';
  const undoableTimeout = options.undoableTimeout ?? adminOptions.undoableTimeout ?? 5000;

  const overtime = createOvertimeTracker(() => mutation.isPending, options.overtimeOptions ?? adminOptions.overtime);

  const mutation = createMutation<
    { data: TData },
    TError,
    UseDeleteMutateParams<TVariables>
  >(() => ({
    ...options.mutationOptions,
    mutationFn: async (params) => {
      const resName = params.resource ?? defaultResource;
      const targetId = params.id ?? defaultId;
      if (targetId == null) throw new Error('useDelete requires an id');

      if (mutationMode === 'undoable') {
        await new Promise<void>((resolve, reject) => {
          toast.undoable('Action can be undone', undoableTimeout, () => {
            params.onCancel?.();
            reject(new UndoError());
          }, resolve);
        });
      }

      const provider = adminContext.getDataProviderForResource(resName, params.dataProviderName);
      return await provider.deleteOne<TData, TVariables>({
          resource: resName,
          id: targetId,
          variables: params.variables,
          meta: params.meta,
        });
    },
    onMutate: async (params) => {
      const userOnMutate = options.mutationOptions?.onMutate;
      const userContext = typeof userOnMutate === 'function' ? await userOnMutate(params) : undefined;
      
      if (mutationMode === 'pessimistic') return { _svadmin_ctx: true, userContext };
      const resName = params.resource ?? defaultResource;
      const targetId = params.id ?? defaultId;
      const dpN = params.dataProviderName;
      const dp = (q: { queryKey: readonly unknown[] }) =>
        queryKeyMatchesTenant(q.queryKey, adminContext.tenantCacheKey) && q.queryKey[0] === dpN;
      
      await queryClient.cancelQueries({ predicate: (q) => dp(q) && q.queryKey[1] === resName });

      const previousQueries = queryClient.getQueriesData({ predicate: (q) => dp(q) && q.queryKey[1] === resName });
      
      const pk = adminContext.getResource(resName).primaryKey ?? 'id';
      
      if (targetId != null) queryClient.removeQueries({ predicate: (q) => dp(q) && q.queryKey[1] === resName && q.queryKey[2] === 'one' && q.queryKey[3] === targetId });

      queryClient.setQueriesData({ predicate: (q) => dp(q) && q.queryKey[1] === resName && q.queryKey[2] === 'list' }, (old: unknown) => {
        if (!old || typeof old !== 'object' || !('data' in old)) return old;
        const o = old as { data: Record<string, unknown>[]; total?: number };
        const filtered = o.data.filter((item) => String(item[pk]) !== String(targetId));
        return { ...o, data: filtered, total: (o.total ?? o.data.length) - (o.data.length - filtered.length) };
      });

      queryClient.setQueriesData({ predicate: (q) => dp(q) && q.queryKey[1] === resName && q.queryKey[2] === 'many' }, (old: unknown) => {
        if (!old || typeof old !== 'object' || !('data' in old)) return old;
        const o = old as { data: Record<string, unknown>[] };
        return { ...o, data: o.data.filter((item) => String(item[pk]) !== String(targetId)) };
      });

      return { _svadmin_ctx: true, userContext, previousQueries };
    },
    onSuccess: (data, params, context) => {
      const extractedCtx = (context as MutationContext)?._svadmin_ctx ? (context as MutationContext).userContext : context;
      const resName = params.resource ?? defaultResource;
      const targetId = params.id ?? defaultId;

      // Remove detail cache entry (refine pattern — no stale show page)
      if (targetId != null) {
        queryClient.removeQueries({
          predicate: (q) => queryKeyMatchesTenant(q.queryKey, adminContext.tenantCacheKey)
            && q.queryKey[0] === params.dataProviderName
            && q.queryKey[1] === resName
            && q.queryKey[2] === 'one'
            && q.queryKey[3] === targetId,
        });
      }

      fireSuccessNotification({
        config: params.successNotification,
        defaultMessage: 'Deleted successfully',
        data: data.data,
        values: params.variables,
        resource: resName,
        provider: adminContext.notificationProvider,
      });
      auditWithProvider(
        {
          action: 'delete',
          resource: resName,
          recordId: String(targetId),
          meta: adminContext.getProviderMeta(resName),
        },
        adminContext.auditLogProvider,
      );
      publishLiveEvent(resName, 'deleted', targetId != null ? [targetId] : undefined, adminContext);
      if (typeof options.mutationOptions?.onSuccess === 'function') {
        (options.mutationOptions.onSuccess as (...a: unknown[]) => unknown)(data, params, extractedCtx);
      }
    },
    onSettled: (_data, error, params) => {
      if (error instanceof UndoError) return;
      const resName = params.resource ?? defaultResource;
      const targetId = params.id ?? defaultId;
      invalidateByScopes(
        queryClient,
        resName,
        params.invalidates,
        ['list', 'many'],
        targetId != null ? targetId : undefined,
        params.dataProviderName,
        (queryKey) => queryKeyMatchesTenant(queryKey, adminContext.tenantCacheKey),
      );
      if (typeof options.mutationOptions?.onSettled === 'function') {
        (options.mutationOptions.onSettled as (...a: unknown[]) => unknown)(_data, error, params, undefined);
      }
    },
    onError: (error, params, context: unknown) => {
      const ctx = context as MutationContext | undefined;
      if (ctx?.previousQueries) {
        for (const [queryKey, data] of ctx.previousQueries) {
          queryClient.setQueryData(queryKey as string[], data);
        }
      }
      if (error instanceof UndoError) return;
      checkError(error, adminContext);
      const extractedCtx = ctx?._svadmin_ctx ? ctx.userContext : context;
      fireErrorNotification({
        config: params.errorNotification,
        defaultMessage: 'Delete failed',
        error,
        resource: params.resource ?? defaultResource,
        provider: adminContext.notificationProvider,
      });
      if (typeof options.mutationOptions?.onError === 'function') {
        (options.mutationOptions.onError as (...a: unknown[]) => unknown)(error, params, extractedCtx);
      }
    },
  }));

  return { mutation, get overtime() { return overtime; } };
}
