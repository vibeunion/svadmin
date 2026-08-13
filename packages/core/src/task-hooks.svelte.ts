import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { getAdminOptions } from './options.svelte';
import { captureAdminContext } from './context.svelte';
import type { AdminContextAccessor } from './context.svelte';
import {
  resolveTenantProviderMeta,
} from './provider-bundle';
import { queryKeyMatches } from './query-keys';
import { checkError, createOvertimeTracker, fireErrorNotification, fireSuccessNotification } from './hook-utils.svelte';
import type { NotificationConfig, OvertimeOptions } from './hook-utils.svelte';
import { useTranslation } from './i18n.svelte';
import type {
  HttpError,
  SubmitTaskOptions,
  TaskHandle,
  TaskListResult,
  TaskProvider,
  TaskRecord,
} from './types';

function normalizeTaskProvider<TTask extends TaskRecord = TaskRecord>(
  provider?: TaskProvider<TTask>,
  adminContext: AdminContextAccessor = captureAdminContext(),
): TaskProvider<TTask> {
  const activeProvider = provider ?? adminContext.taskProvider;
  if (!activeProvider) {
    throw new Error('TaskProvider not found. Did you call setTaskProvider in App.svelte?');
  }
  return activeProvider as TaskProvider<TTask>;
}

export interface UseSubmitTaskOptions {
  mutationOptions?: {
    onSuccess?: (data: unknown, variables: unknown, context: unknown) => void;
    onError?: (error: unknown, variables: unknown, context: unknown) => void;
  };
  overtimeOptions?: OvertimeOptions;
}

export interface UseSubmitTaskMutateParams<TTask extends TaskRecord = TaskRecord> {
  taskName: string;
  options?: SubmitTaskOptions;
  taskProvider?: TaskProvider<TTask>;
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
}

export function useSubmitTask<
  TTask extends TaskRecord = TaskRecord,
  TError = HttpError,
>(options: UseSubmitTaskOptions = {}) {
  const adminContext = captureAdminContext();
  const i18n = useTranslation();
  const adminOptions = getAdminOptions();
  const queryClient = useQueryClient();
  const overtime = createOvertimeTracker(() => mutation.isPending, options.overtimeOptions ?? adminOptions.overtime);

  const mutation = createMutation<TaskHandle<TTask>, TError, UseSubmitTaskMutateParams<TTask>>(() => ({
    mutationFn: async (params) => {
      const provider = normalizeTaskProvider<TTask>(params.taskProvider, adminContext);
      const providerMeta = adminContext.tenant
        ? {
            ...(params.options?.meta ?? {}),
            ...resolveTenantProviderMeta(adminContext.tenant, adminContext.tenantAdapter),
          }
        : params.options?.meta;
      const taskOptions = providerMeta === params.options?.meta
        ? params.options
        : { ...params.options, meta: providerMeta };
      return provider.submit(params.taskName, taskOptions);
    },
    onSuccess: (data, params, context) => {
      fireSuccessNotification({
        config: params.successNotification,
        defaultMessage: i18n.t('task.submitSuccess'),
        data,
        values: params.options,
        resource: params.taskName,
        provider: adminContext.notificationProvider,
      });
      void queryClient.invalidateQueries({
        predicate: (query) => queryKeyMatches(query.queryKey, {
          ...adminContext.queryKeyMatcher(),
          kind: 'task',
          action: 'list',
        }),
      });
      options.mutationOptions?.onSuccess?.(data, params, context);
    },
    onError: (error, params, context) => {
      checkError(error, adminContext);
      fireErrorNotification({
        config: params.errorNotification,
        defaultMessage: i18n.t('task.submitFailed'),
        error,
        resource: params.taskName,
        provider: adminContext.notificationProvider,
      });
      options.mutationOptions?.onError?.(error, params, context);
    },
  }));

  return { mutation, get overtime() { return overtime; } };
}

export interface UseTaskOptions<TTask extends TaskRecord = TaskRecord, _TError = HttpError> {
  taskId?: string;
  taskProvider?: TaskProvider<TTask>;
  queryOptions?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
    refetchInterval?: number | false;
    refetchIntervalInBackground?: boolean;
  };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  overtimeOptions?: OvertimeOptions;
}

export function useTask<TTask extends TaskRecord = TaskRecord, TError = HttpError>(
  options: UseTaskOptions<TTask, TError> = {},
) {
  const adminContext = captureAdminContext();
  const i18n = useTranslation();
  const adminOptions = getAdminOptions();

  const query = createQuery<TTask, TError>(() => {
    const provider = normalizeTaskProvider<TTask>(options.taskProvider, adminContext);
    const queryOptions = options.queryOptions;
    return {
      queryKey: adminContext.queryKeys().task.one(options.taskId ?? ''),
      queryFn: async () => {
        if (!options.taskId) throw new Error('useTask requires a taskId');
        return provider.get(options.taskId);
      },
      enabled: (queryOptions?.enabled ?? true) && !!options.taskId,
      staleTime: queryOptions?.staleTime ?? adminOptions.reactQuery?.staleTime,
      gcTime: queryOptions?.gcTime ?? adminOptions.reactQuery?.gcTime,
      refetchOnWindowFocus: queryOptions?.refetchOnWindowFocus ?? adminOptions.reactQuery?.refetchOnWindowFocus,
      refetchInterval: queryOptions?.refetchInterval,
      refetchIntervalInBackground: queryOptions?.refetchIntervalInBackground,
    };
  });

  const overtime = createOvertimeTracker(() => query.isLoading, options.overtimeOptions ?? adminOptions.overtime);

  let lastSuccessAt = 0;
  let lastErrorAt = 0;
  $effect(() => {
    if (query.isSuccess && query.dataUpdatedAt > lastSuccessAt) {
      lastSuccessAt = query.dataUpdatedAt;
      if (options.successNotification) {
        fireSuccessNotification({
          config: options.successNotification,
          defaultMessage: '',
          data: query.data,
          resource: options.taskId,
          provider: adminContext.notificationProvider,
        });
      }
    } else if (query.isError && query.errorUpdatedAt > lastErrorAt) {
      lastErrorAt = query.errorUpdatedAt;
      checkError(query.error, adminContext);
      fireErrorNotification({
        config: options.errorNotification,
        defaultMessage: i18n.t('task.fetchFailed'),
        error: query.error,
        resource: options.taskId,
        provider: adminContext.notificationProvider,
      });
    }
  });

  return new Proxy(query, {
    get(target, prop) {
      if (prop === 'overtime') return overtime;
      return target[prop as keyof typeof target];
    },
  }) as typeof query & { overtime: typeof overtime };
}

export interface UseTaskListOptions<TTask extends TaskRecord = TaskRecord, _TError = HttpError> {
  params?: Record<string, unknown>;
  dlq?: boolean;
  taskProvider?: TaskProvider<TTask>;
  queryOptions?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
    refetchInterval?: number | false;
    refetchIntervalInBackground?: boolean;
  };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  overtimeOptions?: OvertimeOptions;
}

export function useTaskList<TTask extends TaskRecord = TaskRecord, TError = HttpError>(
  options: UseTaskListOptions<TTask, TError> = {},
) {
  const adminContext = captureAdminContext();
  const i18n = useTranslation();
  const adminOptions = getAdminOptions();

  const query = createQuery<TaskListResult<TTask>, TError>(() => {
    const provider = normalizeTaskProvider<TTask>(options.taskProvider, adminContext);
    const queryOptions = options.queryOptions;
    return {
      queryKey: adminContext.queryKeys().task.list({
        list: options.dlq ? 'dlq' : 'default',
        params: options.params,
      }),
      queryFn: async () => {
        if (options.dlq) {
          if (!provider.listDlq) throw new Error('TaskProvider does not implement listDlq');
          return provider.listDlq(options.params);
        }
        if (!provider.list) throw new Error('TaskProvider does not implement list');
        return provider.list(options.params);
      },
      enabled: queryOptions?.enabled ?? true,
      staleTime: queryOptions?.staleTime ?? adminOptions.reactQuery?.staleTime,
      gcTime: queryOptions?.gcTime ?? adminOptions.reactQuery?.gcTime,
      refetchOnWindowFocus: queryOptions?.refetchOnWindowFocus ?? adminOptions.reactQuery?.refetchOnWindowFocus,
      refetchInterval: queryOptions?.refetchInterval,
      refetchIntervalInBackground: queryOptions?.refetchIntervalInBackground,
    };
  });

  const overtime = createOvertimeTracker(() => query.isLoading, options.overtimeOptions ?? adminOptions.overtime);

  let lastSuccessAt = 0;
  let lastErrorAt = 0;
  $effect(() => {
    if (query.isSuccess && query.dataUpdatedAt > lastSuccessAt) {
      lastSuccessAt = query.dataUpdatedAt;
      if (options.successNotification) {
        fireSuccessNotification({
          config: options.successNotification,
          defaultMessage: '',
          data: query.data,
          values: options.params,
          resource: options.dlq ? 'taskDlq' : 'tasks',
          provider: adminContext.notificationProvider,
        });
      }
    } else if (query.isError && query.errorUpdatedAt > lastErrorAt) {
      lastErrorAt = query.errorUpdatedAt;
      checkError(query.error, adminContext);
      fireErrorNotification({
        config: options.errorNotification,
        defaultMessage: i18n.t('task.fetchListFailed'),
        error: query.error,
        resource: options.dlq ? 'taskDlq' : 'tasks',
        provider: adminContext.notificationProvider,
      });
    }
  });

  return new Proxy(query, {
    get(target, prop) {
      if (prop === 'overtime') return overtime;
      return target[prop as keyof typeof target];
    },
  }) as typeof query & { overtime: typeof overtime };
}

export interface UseTaskSubscriptionOptions<TTask extends TaskRecord = TaskRecord> {
  taskId: string;
  taskProvider?: TaskProvider<TTask>;
  enabled?: boolean;
  onTask: (task: TTask) => void;
}

export function useTaskSubscription<TTask extends TaskRecord = TaskRecord>(
  options: UseTaskSubscriptionOptions<TTask>,
): void {
  const adminContext = captureAdminContext();
  $effect(() => {
    const enabled = options.enabled ?? true;
    if (!enabled) return;

    const provider = normalizeTaskProvider<TTask>(options.taskProvider, adminContext);
    if (!provider.subscribe) {
      throw new Error('TaskProvider does not implement subscribe');
    }

    const subscription = provider.subscribe(options.taskId, options.onTask);
    if (!subscription) return;

    if (typeof subscription === 'function') {
      return subscription;
    }

    if (typeof subscription.unsubscribe === 'function') {
      return () => subscription.unsubscribe();
    }
  });
}
