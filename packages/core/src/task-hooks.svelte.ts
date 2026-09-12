import { definedOptions } from './defined-options';
import { createMutation,createQuery,useQueryClient } from '@tanstack/svelte-query';
import { getAdminOptions } from './options.svelte';
import { captureAdminContext } from './context.svelte';
import type { AdminContextAccessor } from './context.svelte';
import {
  resolveTenantProviderMeta,
} from './provider-bundle';
import { queryKeyMatches, type QueryKey } from './query-keys';
import { replaceReactiveMembers } from './reactive-projection';
import { taskQueryParams, withValidatedTaskProvider } from './task-provider';
import type { TaskError } from './task-contract';
import { checkError,createOvertimeTracker,fireErrorNotification,fireSuccessNotification } from './hook-utils.svelte';
import type { NotificationConfig,OvertimeOptions } from './hook-utils.svelte';
import { useTranslation } from './i18n.svelte';
import type {
  SubmitTaskOptions,
  TaskHandle,
  TaskListResult,
  TaskProvider,
  TaskRecord,
} from './types';

function normalizeTaskProvider(
  provider?: TaskProvider,
  adminContext: AdminContextAccessor=captureAdminContext(),
): TaskProvider {
  const activeProvider=provider??adminContext.taskProvider;
  if(!activeProvider) {
    throw new Error('TaskProvider not found. Did you call setTaskProvider in App.svelte?');
  }
  return withValidatedTaskProvider(activeProvider);
}

const providerKeys = new WeakMap<TaskProvider, number>();
let nextProviderKey = 0;
function taskProviderKey(provider: TaskProvider | undefined): number {
  if (!provider) return 0;
  let providerKey = providerKeys.get(provider);
  if (providerKey === undefined) {
    providerKey = ++nextProviderKey;
    providerKeys.set(provider, providerKey);
  }
  return providerKey;
}
function scopedTaskKey(key: QueryKey, provider: TaskProvider | undefined): QueryKey {
  const providerKey = taskProviderKey(provider);
  return [{ ...key[0], params: definedOptions({ taskProvider: providerKey, query: key[0].params }) }];
}

export interface UseSubmitTaskOptions {
  mutationOptions?: {
    onSuccess?: (data: unknown,variables: unknown,context: unknown) => void;
    onError?: (error: unknown,variables: unknown,context: unknown) => void;
  };
  overtimeOptions?: OvertimeOptions;
}

export interface UseSubmitTaskMutateParams {
  taskName: string;
  options?: SubmitTaskOptions;
  taskProvider?: TaskProvider;
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
}

export function useSubmitTask(options: UseSubmitTaskOptions={}) {
  const adminContext=captureAdminContext();
  const i18n=useTranslation();
  const adminOptions=getAdminOptions();
  const queryClient=useQueryClient();
  const overtime=createOvertimeTracker(() => mutation.isPending,options.overtimeOptions??adminOptions.overtime);
  const submissionScopes = new WeakMap<TaskHandle, ReturnType<AdminContextAccessor['queryKeyMatcher']>>();

  const mutation=createMutation<TaskHandle,Error,UseSubmitTaskMutateParams>(() => ({
    mutationFn: async (params) => {
      const scope = adminContext.queryKeyMatcher();
      const provider=normalizeTaskProvider(params.taskProvider,adminContext);
      const providerMeta=adminContext.tenant
        ? {
          ...(params.options?.meta??{}),
          ...resolveTenantProviderMeta(adminContext.tenant,adminContext.tenantAdapter),
        }
        :params.options?.meta;
      const taskOptions=providerMeta===params.options?.meta
        ? params.options
        :definedOptions({
          ...params.options,
          meta: providerMeta,
        });
      const handle = await provider.submit(params.taskName,taskOptions);
      submissionScopes.set(handle, scope);
      return handle;
    },
    onSuccess: (data,params,context) => {
      fireSuccessNotification({
        config: params.successNotification,
        defaultMessage: i18n.t('task.submitSuccess'),
        data,
        values: params.options,
        resource: params.taskName,
        ...definedOptions({
          provider: adminContext.notificationProvider
        })
      });
      const scope = submissionScopes.get(data);
      if (scope) {
        submissionScopes.delete(data);
        void queryClient.invalidateQueries({
          predicate: (query) => queryKeyMatches(query.queryKey,{
            ...scope,
            kind: 'task',
            action: 'list',
          }),
        });
      }
      options.mutationOptions?.onSuccess?.(data,params,context);
    },
    onError: (error,params,context) => {
      checkError(error,adminContext);
      fireErrorNotification({
        config: params.errorNotification,
        defaultMessage: i18n.t('task.submitFailed'),
        error,
        resource: params.taskName,
        ...definedOptions({
          provider: adminContext.notificationProvider
        })
      });
      options.mutationOptions?.onError?.(error,params,context);
    },
  }));

  return { mutation,get overtime() { return overtime; } };
}

export interface UseTaskOptions {
  taskId?: string;
  taskProvider?: TaskProvider;
  queryOptions?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
    refetchInterval?: number|false;
    refetchIntervalInBackground?: boolean;
  };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  overtimeOptions?: OvertimeOptions;
}

export function useTask(
  options: UseTaskOptions={},
) {
  const adminContext=captureAdminContext();
  const i18n=useTranslation();
  const adminOptions=getAdminOptions();

  const query=createQuery<TaskRecord,Error>(() => {
    const activeProvider=options.taskProvider??adminContext.taskProvider;
    const provider=activeProvider? withValidatedTaskProvider(activeProvider):undefined;
    const taskId=options.taskId;
    const queryOptions=options.queryOptions;
    return {
      queryKey: scopedTaskKey(adminContext.queryKeys().task.one(taskId??''),provider),
      queryFn: async () => {
        if(!provider) throw new Error('TaskProvider not found.');
        if(!taskId) throw new Error('useTask requires a taskId');
        return provider.get(taskId);
      },
      enabled: (queryOptions?.enabled??true)&&!!taskId,
      ...definedOptions({
        staleTime: queryOptions?.staleTime??adminOptions.reactQuery?.staleTime,
        gcTime: queryOptions?.gcTime??adminOptions.reactQuery?.gcTime,
        refetchOnWindowFocus: queryOptions?.refetchOnWindowFocus??adminOptions.reactQuery?.refetchOnWindowFocus,
      }),
      ...definedOptions({
        refetchInterval: queryOptions?.refetchInterval,
        refetchIntervalInBackground: queryOptions?.refetchIntervalInBackground,
      }),
    };
  });

  const overtime=createOvertimeTracker(() => query.isLoading,options.overtimeOptions??adminOptions.overtime);

  let lastSuccessAt=0;
  let lastErrorAt=0;
  $effect(() => {
    if(query.isSuccess&&query.dataUpdatedAt>lastSuccessAt) {
      lastSuccessAt=query.dataUpdatedAt;
      if(options.successNotification) {
        fireSuccessNotification({
          config: options.successNotification,
          defaultMessage: '',
          data: query.data,
          ...definedOptions({ resource: options.taskId }),
          ...definedOptions({
            provider: adminContext.notificationProvider
          })
        });
      }
    } else if(query.isError&&query.errorUpdatedAt>lastErrorAt) {
      lastErrorAt=query.errorUpdatedAt;
      checkError(query.error,adminContext);
      fireErrorNotification({
        config: options.errorNotification,
        defaultMessage: i18n.t('task.fetchFailed'),
        error: query.error,
        ...definedOptions({ resource: options.taskId }),
        ...definedOptions({
          provider: adminContext.notificationProvider
        })
      });
    }
  });

  return replaceReactiveMembers(query,{ get overtime() { return overtime; } });
}

export interface UseTaskListOptions {
  params?: Record<string,unknown>;
  dlq?: boolean;
  taskProvider?: TaskProvider;
  queryOptions?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
    refetchInterval?: number|false;
    refetchIntervalInBackground?: boolean;
  };
  successNotification?: NotificationConfig;
  errorNotification?: NotificationConfig;
  overtimeOptions?: OvertimeOptions;
}

export function useTaskList(
  options: UseTaskListOptions={},
) {
  const adminContext=captureAdminContext();
  const i18n=useTranslation();
  const adminOptions=getAdminOptions();

  const query=createQuery<TaskListResult,Error>(() => {
    const activeProvider=options.taskProvider??adminContext.taskProvider;
    const provider=activeProvider? withValidatedTaskProvider(activeProvider):undefined;
    const params=options.params===undefined? undefined:taskQueryParams(options.params);
    const dlq=options.dlq??false;
    const queryOptions=options.queryOptions;
    return {
      queryKey: scopedTaskKey(adminContext.queryKeys().task.list(definedOptions({
        list: dlq? 'dlq':'default',
        params,
      })),provider),
      queryFn: async () => {
        if(!provider) throw new Error('TaskProvider not found.');
        if(dlq) {
          if(!provider.listDlq) throw new Error('TaskProvider does not implement listDlq');
          return provider.listDlq(params);
        }
        if(!provider.list) throw new Error('TaskProvider does not implement list');
        return provider.list(params);
      },
      enabled: queryOptions?.enabled??true,
      ...definedOptions({
        staleTime: queryOptions?.staleTime??adminOptions.reactQuery?.staleTime,
        gcTime: queryOptions?.gcTime??adminOptions.reactQuery?.gcTime,
        refetchOnWindowFocus: queryOptions?.refetchOnWindowFocus??adminOptions.reactQuery?.refetchOnWindowFocus,
      }),
      ...definedOptions({
        refetchInterval: queryOptions?.refetchInterval,
        refetchIntervalInBackground: queryOptions?.refetchIntervalInBackground,
      }),
    };
  });

  const overtime=createOvertimeTracker(() => query.isLoading,options.overtimeOptions??adminOptions.overtime);

  let lastSuccessAt=0;
  let lastErrorAt=0;
  $effect(() => {
    if(query.isSuccess&&query.dataUpdatedAt>lastSuccessAt) {
      lastSuccessAt=query.dataUpdatedAt;
      if(options.successNotification) {
        fireSuccessNotification({
          config: options.successNotification,
          defaultMessage: '',
          data: query.data,
          values: options.params,
          resource: options.dlq? 'taskDlq':'tasks',
          ...definedOptions({
            provider: adminContext.notificationProvider
          })
        });
      }
    } else if(query.isError&&query.errorUpdatedAt>lastErrorAt) {
      lastErrorAt=query.errorUpdatedAt;
      checkError(query.error,adminContext);
      fireErrorNotification({
        config: options.errorNotification,
        defaultMessage: i18n.t('task.fetchListFailed'),
        error: query.error,
        resource: options.dlq? 'taskDlq':'tasks',
        ...definedOptions({
          provider: adminContext.notificationProvider
        })
      });
    }
  });

  return replaceReactiveMembers(query,{ get overtime() { return overtime; } });
}

export interface UseTaskSubscriptionOptions {
  taskId: string;
  taskProvider?: TaskProvider;
  enabled?: boolean;
  onTask: (task: TaskRecord) => void;
  onError?: (error: TaskError) => void;
}

export function useTaskSubscription(
  options: UseTaskSubscriptionOptions,
): void {
  const adminContext=captureAdminContext();
  $effect(() => {
    const enabled=options.enabled??true;
    if(!enabled) return;

    const provider=normalizeTaskProvider(options.taskProvider,adminContext);
    if(!provider.subscribe) {
      throw new Error('TaskProvider does not implement subscribe');
    }

    const subscription=provider.subscribe(options.taskId,options.onTask,options.onError);

    if(typeof subscription==='function') {
      return subscription;
    }

    if(typeof subscription.unsubscribe==='function') {
      return () => subscription.unsubscribe();
    }
  });
}
