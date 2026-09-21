import { definedOptions } from './defined-options';
import { onDestroy } from 'svelte';
import { createMutation,useQueryClient } from '@tanstack/svelte-query';
import { createSessionQuery } from './session-query.svelte';
import { supersededQuerySession } from './query-session.svelte';
import { captureAuthLiveScope } from './auth-hooks.svelte';
import { getAdminOptions } from './options.svelte';
import { captureAdminContext } from './context.svelte';
import type { AdminContextAccessor } from './context.svelte';
import {
  resolveTenantProviderMeta,
} from './provider-bundle';
import { queryKeyMatches, type QueryKey } from './query-keys';
import { replaceReactiveMembers } from './reactive-projection';
import { taskQueryParams, withValidatedTaskProvider } from './task-provider';
import { TaskError, decodeTaskRecord, decodeTaskList } from './task-contract';
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

function taskReadError(error: unknown): Error {
  try {
    if (typeof error === 'object' && error !== null) {
      const code: unknown = Object.getOwnPropertyDescriptor(error, 'code')?.value;
      if (code === 'QUERY_SESSION_SUPERSEDED') return supersededQuerySession();
      if (code === 'INVALID_TASK_INPUT' || code === 'INVALID_TASK_RESPONSE' || code === 'TASK_PROVIDER_FAILED') {
        return new TaskError(code);
      }
    }
  } catch { /* 不执行错误对象中的 getter，也不回显上游诊断。 */ }
  return new TaskError('TASK_PROVIDER_FAILED');
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
  let disposed = false;
  onDestroy(() => { disposed = true; });
  interface SubmissionScope {
    queryScope: ReturnType<AdminContextAccessor['queryKeyMatcher']>;
    auth: ReturnType<typeof captureAuthLiveScope>;
    notification: AdminContextAccessor['notificationProvider'];
    current: () => boolean;
  }
  const submissionScopes = new WeakMap<TaskHandle, SubmissionScope>();
  const failureScopes = new WeakMap<Error, SubmissionScope>();

  const mutation=createMutation<TaskHandle,Error,UseSubmitTaskMutateParams>(() => ({
    mutationFn: async (params) => {
      const authProvider = adminContext.authProvider;
      const auth = captureAuthLiveScope(authProvider);
      const source = params.taskProvider ?? adminContext.taskProvider;
      const tenant = adminContext.tenantCacheKey?.__svadminTenant;
      const router = adminContext.routerProvider;
      const access = adminContext.accessControlProvider;
      const notification = adminContext.notificationProvider;
      const scope: SubmissionScope = {
        queryScope: adminContext.queryKeyMatcher(),
        auth,
        notification,
        current: () => !disposed && auth.isCurrent() && adminContext.authProvider === authProvider
          && adminContext.tenantCacheKey?.__svadminTenant === tenant
          && adminContext.routerProvider === router && adminContext.accessControlProvider === access
          && adminContext.notificationProvider === notification
          && (params.taskProvider ?? adminContext.taskProvider) === source,
      };
      if (!scope.current()) throw supersededQuerySession();
      try {
        const provider=normalizeTaskProvider(source,adminContext);
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
      } catch (error) {
        const failure = error instanceof TaskError ? error : new TaskError('TASK_PROVIDER_FAILED');
        failureScopes.set(failure, scope);
        throw failure;
      }
    },
    onSuccess: (data,params,context) => {
      const submission = submissionScopes.get(data);
      if (submission) submissionScopes.delete(data);
      if (!submission) return;
      if (submission.auth.isCurrent()) {
        void queryClient.invalidateQueries({
          predicate: (query) => queryKeyMatches(query.queryKey,{
            ...submission.queryScope,
            kind: 'task',
            action: 'list',
          }),
        });
      }
      if (!submission.current()) return;
      fireSuccessNotification({
        config: params.successNotification,
        defaultMessage: i18n.t('task.submitSuccess'),
        data,
        values: params.options,
        resource: params.taskName,
        ...definedOptions({
          provider: submission.notification
        })
      });
      if (submission.current()) options.mutationOptions?.onSuccess?.(data,params,context);
    },
    onError: (error,params,context) => {
      const submission = failureScopes.get(error);
      failureScopes.delete(error);
      if (!submission?.current()) return;
      checkError(error,adminContext);
      if (!submission.current()) return;
      fireErrorNotification({
        config: params.errorNotification,
        defaultMessage: i18n.t('task.submitFailed'),
        error,
        resource: params.taskName,
        ...definedOptions({
          provider: submission.notification
        })
      });
      if (submission.current()) options.mutationOptions?.onError?.(error,params,context);
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

  const query=createSessionQuery<TaskRecord>(adminContext, () => {
    const activeProvider=options.taskProvider??adminContext.taskProvider;
    const provider=activeProvider? withValidatedTaskProvider(activeProvider):undefined;
    const taskId=options.taskId;
    const queryOptions=options.queryOptions;
    return {
      resource: taskId ?? '',
      successNotification: options.successNotification,
      errorNotification: options.errorNotification ?? i18n.t('task.fetchFailed'),
      normalizeError: taskReadError,
      decode: value => decodeTaskRecord(value, taskId),
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

  const query=createSessionQuery<TaskListResult>(adminContext, () => {
    const activeProvider=options.taskProvider??adminContext.taskProvider;
    const provider=activeProvider? withValidatedTaskProvider(activeProvider):undefined;
    const params=options.params===undefined? undefined:taskQueryParams(options.params);
    const callerMeta = params?.['meta'];
    if (callerMeta !== undefined
      && (typeof callerMeta !== 'object' || callerMeta === null || Array.isArray(callerMeta))) {
      throw new TaskError('INVALID_TASK_INPUT');
    }
    const tenantMeta = adminContext.tenant
      ? resolveTenantProviderMeta(adminContext.tenant, adminContext.tenantAdapter)
      : undefined;
    const providerParams = params === undefined && tenantMeta === undefined ? undefined : {
      ...(params ?? {}),
      ...(tenantMeta ? { meta: { ...(callerMeta ?? {}), ...tenantMeta } } : {}),
    };
    const dlq=options.dlq??false;
    const queryOptions=options.queryOptions;
    const resource = dlq ? 'taskDlq' : 'tasks';
    const successNotification = options.successNotification;
    return {
      resource,
      successNotification: typeof successNotification === 'function'
        ? (data: unknown) => successNotification(data, params, resource)
        : successNotification,
      errorNotification: options.errorNotification ?? i18n.t('task.fetchListFailed'),
      normalizeError: taskReadError,
      decode: decodeTaskList,
      queryKey: scopedTaskKey(adminContext.queryKeys().task.list(definedOptions({
        list: dlq? 'dlq':'default',
        params: providerParams,
      })),provider),
      queryFn: async () => {
        if(!provider) throw new Error('TaskProvider not found.');
        if(dlq) {
          if(!provider.listDlq) throw new Error('TaskProvider does not implement listDlq');
          return provider.listDlq(providerParams);
        }
        if(!provider.list) throw new Error('TaskProvider does not implement list');
        return provider.list(providerParams);
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

    const authProvider = adminContext.authProvider;
    const auth = captureAuthLiveScope(authProvider);
    if (!auth.available) return;
    const source = options.taskProvider ?? adminContext.taskProvider;
    const tenant = adminContext.tenantCacheKey?.__svadminTenant;
    const router = adminContext.routerProvider;
    const access = adminContext.accessControlProvider;
    const taskId = options.taskId;
    const onTask = options.onTask;
    const onError = options.onError;
    let active = true;
    const current = () => active && (options.enabled ?? true) && options.taskId === taskId
      && (options.taskProvider ?? adminContext.taskProvider) === source
      && adminContext.authProvider === authProvider && auth.isCurrent()
      && adminContext.tenantCacheKey?.__svadminTenant === tenant
      && adminContext.routerProvider === router && adminContext.accessControlProvider === access;
    const provider=normalizeTaskProvider(source,adminContext);
    if(!provider.subscribe) {
      throw new Error('TaskProvider does not implement subscribe');
    }

    const subscription=provider.subscribe(taskId,
      task => { if (current()) onTask(task); },
      error => { if (current()) onError?.(error); },
    );
    return () => {
      // 先失效，再退订；上游退订时同步发出的最后一条事件也不能进入新会话。
      active = false;
      if (typeof subscription === 'function') subscription();
      else subscription.unsubscribe();
    };
  });
}
