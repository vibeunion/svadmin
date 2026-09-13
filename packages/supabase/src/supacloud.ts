import type {
  LiveEvent,
  LiveProvider,
  SubmitTaskOptions,
  TaskHandle,
  TaskListResult,
  TaskProvider,
  TaskRecord,
  TaskSubscription,
} from '@svadmin/core';

export interface SupaCloudTaskRecord extends TaskRecord {
  [key: string]: unknown;
}

export interface SupaCloudTaskReceipt<TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord> {
  id?: string;
  taskId?: string;
  wait(options?: unknown): Promise<TTask>;
  cancel?(): Promise<unknown>;
  retry?(): Promise<unknown>;
  subscribe?(
    options: {
      onUpdate: (task: TTask) => void;
      onStateChange?: (state: unknown, details?: { error?: unknown }) => void;
      onError?: (error: unknown) => void;
      stopOnTerminal?: boolean;
    }
  ): TaskSubscription | (() => void) | undefined;
}

export interface SupaCloudTaskLegacyClient<TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord> {
  submit(taskName: string, options?: SubmitTaskOptions): Promise<TaskHandle<TTask>>;
  get(taskId: string): Promise<TTask>;
  list?(params?: Record<string, unknown>): Promise<TTask[] | { data?: TTask[] }>;
  listDlq?(params?: Record<string, unknown>): Promise<TTask[] | { data?: TTask[] }>;
  cancel?(taskId: string): Promise<unknown>;
  retry?(taskId: string): Promise<unknown>;
  subscribe?(
    taskId: string,
    callback: (task: TTask) => void
  ): TaskSubscription | (() => void) | undefined;
}

export interface SupaCloudTaskSdkClient<TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord> {
  tasks: {
    submit(taskName: string, options?: Record<string, unknown>): Promise<SupaCloudTaskReceipt<TTask>>;
    get(taskId: string): Promise<TTask>;
    list?(params?: Record<string, unknown>): Promise<TTask[]>;
    listDlq?(limit?: number): Promise<TTask[]>;
    cancel?(taskId: string): Promise<unknown>;
    retry?(taskId: string): Promise<unknown>;
    subscribe?(
      taskId: string,
      options: {
        onUpdate: (task: TTask) => void;
        onStateChange?: (state: unknown, details?: { error?: unknown }) => void;
        onError?: (error: unknown) => void;
        stopOnTerminal?: boolean;
      }
    ): TaskSubscription | (() => void) | undefined;
  };
}

export type SupaCloudTaskClient<TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord> =
  | SupaCloudTaskLegacyClient<TTask>
  | SupaCloudTaskSdkClient<TTask>;

export interface CreateSupaCloudTaskProviderOptions<
  TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord,
> {
  supacloud: SupaCloudTaskClient<TTask>;
}

export interface CreateSupaCloudTaskLiveProviderOptions<
  TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord,
> {
  supacloud:
    | Pick<SupaCloudTaskLegacyClient<TTask>, 'subscribe'>
    | SupaCloudTaskSdkClient<TTask>;
  resource?: string;
  mapTaskToEvent?: (task: TTask, resource: string) => LiveEvent;
}

function normalizeTaskSubscription(
  subscription: TaskSubscription | (() => void) | undefined,
): (() => void) | undefined {
  if (!subscription) return undefined;
  if (typeof subscription === 'function') return subscription;
  if (typeof subscription.unsubscribe === 'function') {
    return () => subscription.unsubscribe();
  }
  return undefined;
}

function normalizeTaskHandle<TTask extends SupaCloudTaskRecord>(
  taskHandle: SupaCloudTaskReceipt<TTask>,
): TaskHandle<TTask> {
  if (!taskHandle || typeof taskHandle.wait !== 'function') {
    throw new Error('[svadmin/supabase] SupaCloud client returned an invalid task receipt');
  }

  const normalized: TaskHandle<TTask> = {
    wait: () => taskHandle.wait(),
  };

  const id = 'taskId' in taskHandle && typeof taskHandle.taskId === 'string'
    ? taskHandle.taskId
    : typeof taskHandle.id === 'string'
      ? taskHandle.id
      : undefined;

  if (id) {
    normalized.id = id;
  }

  const cancel = taskHandle.cancel;
  if (typeof cancel === 'function') {
    normalized.cancel = () => cancel.call(taskHandle);
  }

  const retry = taskHandle.retry;
  if (typeof retry === 'function') {
    normalized.retry = () => retry.call(taskHandle);
  }

  const subscribe = taskHandle.subscribe;
  if (typeof subscribe === 'function') {
    normalized.subscribe = (callback) =>
      normalizeTaskSubscription(
        subscribe.call(taskHandle, {
          onUpdate: (task) => callback(task),
        }),
      );
  }

  return normalized;
}

function mapSubmitOptionsToSdk(
  submitOptions?: SubmitTaskOptions,
): Record<string, unknown> | undefined {
  if (!submitOptions) return undefined;

  const sdkOptions: Record<string, unknown> = {};

  if (submitOptions.body !== undefined) sdkOptions.body = submitOptions.body;
  if (submitOptions.headers !== undefined) sdkOptions.headers = submitOptions.headers;
  if (submitOptions.idempotencyKey !== undefined) sdkOptions.idempotencyKey = submitOptions.idempotencyKey;
  if (submitOptions.meta !== undefined) sdkOptions.metadata = submitOptions.meta;

  return sdkOptions;
}

function normalizeTaskList<TTask extends SupaCloudTaskRecord>(
  value: TTask[] | { data?: TTask[] },
  context: string,
): TaskListResult<TTask> {
  if (Array.isArray(value)) {
    return {
      data: value,
      total: value.length,
    };
  }

  if (value && typeof value === 'object' && Array.isArray(value.data)) {
    return {
      data: value.data,
      total: value.data.length,
    };
  }

  throw new Error(`[svadmin/supabase] ${context} returned an invalid task list response`);
}

function getTaskBridge<TTask extends SupaCloudTaskRecord>(
  supacloud: SupaCloudTaskClient<TTask>,
): SupaCloudTaskLegacyClient<TTask> {
  if ('tasks' in supacloud && supacloud.tasks) {
    const sdk = supacloud.tasks;

    return {
      async submit(taskName, submitOptions) {
        const receipt = await sdk.submit(taskName, mapSubmitOptionsToSdk(submitOptions));
        return normalizeTaskHandle(receipt);
      },
      get(taskId) {
        return sdk.get(taskId);
      },
      async list(params) {
        if (!sdk.list) {
          throw new Error('[svadmin/supabase] SupaCloud SDK client does not implement tasks.list');
        }
        return normalizeTaskList(await sdk.list(params), 'tasks.list');
      },
      async listDlq(params) {
        if (!sdk.listDlq) {
          throw new Error('[svadmin/supabase] SupaCloud SDK client does not implement tasks.listDlq');
        }
        const limit = typeof params?.limit === 'number' ? params.limit : undefined;
        return normalizeTaskList(await sdk.listDlq(limit), 'tasks.listDlq');
      },
      cancel(taskId) {
        if (!sdk.cancel) {
          throw new Error('[svadmin/supabase] SupaCloud SDK client does not implement tasks.cancel');
        }
        return sdk.cancel(taskId);
      },
      retry(taskId) {
        if (!sdk.retry) {
          throw new Error('[svadmin/supabase] SupaCloud SDK client does not implement tasks.retry');
        }
        return sdk.retry(taskId);
      },
      subscribe(taskId, callback) {
        if (!sdk.subscribe) {
          throw new Error('[svadmin/supabase] SupaCloud SDK client does not implement tasks.subscribe');
        }
        return sdk.subscribe(taskId, {
          onUpdate: callback,
        });
      },
    };
  }

  return supacloud as SupaCloudTaskLegacyClient<TTask>;
}

function getTaskSubscribeBridge<TTask extends SupaCloudTaskRecord>(
  supacloud:
    | Pick<SupaCloudTaskLegacyClient<TTask>, 'subscribe'>
    | SupaCloudTaskSdkClient<TTask>,
): Pick<SupaCloudTaskLegacyClient<TTask>, 'subscribe'> {
  if ('tasks' in supacloud && supacloud.tasks) {
    return {
      subscribe(taskId, callback) {
        if (!supacloud.tasks.subscribe) {
          throw new Error('[svadmin/supabase] SupaCloud SDK client does not implement tasks.subscribe');
        }

        return supacloud.tasks.subscribe(taskId, {
          onUpdate: callback,
        });
      },
    };
  }

  return supacloud as Pick<SupaCloudTaskLegacyClient<TTask>, 'subscribe'>;
}

function defaultMapTaskToEvent<TTask extends SupaCloudTaskRecord>(
  task: TTask,
  resource: string,
): LiveEvent {
  return {
    type: 'UPDATE',
    resource,
    payload: task as Record<string, unknown>,
  };
}

export function createSupaCloudTaskProvider<
  TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord,
>(options: CreateSupaCloudTaskProviderOptions<TTask>): TaskProvider<TTask> {
  const supacloud = getTaskBridge(options.supacloud);

  return {
    submit(taskName, submitOptions) {
      return supacloud.submit(taskName, submitOptions);
    },
    get(taskId) {
      return supacloud.get(taskId);
    },
    async list(params) {
      if (!supacloud.list) {
        throw new Error('[svadmin/supabase] SupaCloud client does not implement tasks.list');
      }
      return normalizeTaskList(await supacloud.list(params), 'tasks.list');
    },
    async listDlq(params) {
      if (!supacloud.listDlq) {
        throw new Error('[svadmin/supabase] SupaCloud client does not implement tasks.listDlq');
      }
      return normalizeTaskList(await supacloud.listDlq(params), 'tasks.listDlq');
    },
    cancel(taskId) {
      if (!supacloud.cancel) {
        throw new Error('[svadmin/supabase] SupaCloud client does not implement tasks.cancel');
      }
      return supacloud.cancel(taskId);
    },
    retry(taskId) {
      if (!supacloud.retry) {
        throw new Error('[svadmin/supabase] SupaCloud client does not implement tasks.retry');
      }
      return supacloud.retry(taskId);
    },
    subscribe(taskId, callback) {
      if (!supacloud.subscribe) {
        throw new Error('[svadmin/supabase] SupaCloud client does not implement tasks.subscribe');
      }
      return supacloud.subscribe(taskId, callback);
    },
  };
}

export function createSupaCloudTaskLiveProvider<
  TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord,
>(options: CreateSupaCloudTaskLiveProviderOptions<TTask>): LiveProvider {
  const supacloud = getTaskSubscribeBridge(options.supacloud);
  const resourceName = options.resource ?? 'tasks';
  const mapTaskToEvent = options.mapTaskToEvent ?? defaultMapTaskToEvent<TTask>;

  return {
    subscribe({ resource, liveParams, callback }) {
      if (!supacloud.subscribe) {
        throw new Error('[svadmin/supabase] SupaCloud client does not implement tasks.subscribe');
      }

      const taskId = typeof liveParams?.taskId === 'string' ? liveParams.taskId : undefined;
      if (!taskId) {
        throw new Error('[svadmin/supabase] createSupaCloudTaskLiveProvider requires liveParams.taskId');
      }

      const unsubscribe = supacloud.subscribe(taskId, (task) => {
        callback(mapTaskToEvent(task, resource || resourceName));
      });

      return normalizeTaskSubscription(unsubscribe) ?? (() => {});
    },
  };
}
