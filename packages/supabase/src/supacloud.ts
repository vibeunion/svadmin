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

export interface SupaCloudSdkTaskRecord {
  id: string;
  status: string;
  progress?: number | null;
  error?: string | null;
  error_message?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface SupaCloudTaskSnapshot {
  id: string;
  status: string;
  progress?: number | null;
  error?: string | null;
  updatedAt?: string | null;
  raw: unknown;
}

export type SupaCloudTaskSubscribeState = 'connecting' | 'realtime' | 'polling' | 'closed';

export interface SupaCloudTaskSubscribeOptions<TTask = SupaCloudTaskSnapshot> {
  pollingIntervalMs?: number;
  realtimeTimeoutMs?: number;
  reconcileIntervalMs?: number;
  onUpdate: (task: TTask) => void;
  onStateChange?: (state: SupaCloudTaskSubscribeState, details?: { error?: unknown }) => void;
  onError?: (error: unknown) => void;
  stopOnTerminal?: boolean;
}

export interface SupaCloudSdkTaskWaitOptions {
  intervalMs?: number;
  signal?: AbortSignal;
}

export interface SupaCloudSdkTaskSubmitOptions {
  body?: string
    | Blob
    | ArrayBuffer
    | FormData
    | File
    | ReadableStream<Uint8Array>
    | Record<string, unknown>;
  headers?: Record<string, string>;
  retries?: number;
  timeoutSec?: number;
  idempotencyKey?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  correlationId?: string;
  businessTaskId?: string;
  metadata?: Record<string, unknown>;
}

export interface SupaCloudTaskReceipt<
  TTask = SupaCloudTaskRecord,
  TUpdate = TTask,
  TWaitOptions = unknown,
> {
  id?: string;
  taskId?: string;
  status?: string;
  wait(options?: TWaitOptions): Promise<TTask>;
  get?(): Promise<TTask>;
  cancel?(): Promise<unknown>;
  retry?(): Promise<unknown>;
  subscribe?(
    options: Omit<SupaCloudTaskSubscribeOptions<TUpdate>, 'onUpdate'> & {
      onUpdate: (task: TUpdate) => void;
    },
  ): TaskSubscription | (() => void);
}

/** Structural shape of `@supacloud/js` 0.23.x task clients. */
export interface SupaCloudSdkTaskClient<
  TTask = SupaCloudSdkTaskRecord,
  TUpdate = SupaCloudTaskSnapshot,
> {
  submit(
    taskName: string,
    options?: SupaCloudSdkTaskSubmitOptions,
  ): Promise<SupaCloudTaskReceipt<TTask, TUpdate, SupaCloudSdkTaskWaitOptions>>;
  get(taskId: string): Promise<TTask>;
  list?(params?: {
    status?: string | string[];
    taskType?: string | string[];
    functionSlug?: string;
    dlq?: boolean;
    limit?: number;
  }): Promise<TTask[]>;
  listDlq?(limit?: number): Promise<TTask[]>;
  cancel?(taskId: string): Promise<unknown>;
  retry?(taskId: string): Promise<unknown>;
  subscribe?(
    taskId: string,
    options: Omit<SupaCloudTaskSubscribeOptions<TUpdate>, 'onUpdate'> & {
      onUpdate: (task: TUpdate) => void;
    },
  ): TaskSubscription | (() => void);
}

/** Structural shape of a root `createSupaCloudClient()` task result. */
export interface SupaCloudTaskSdkClient<
  TTask = SupaCloudTaskRecord,
  TUpdate = TTask,
  TWaitOptions = unknown,
> {
  tasks: {
    submit(
      taskName: string,
      options?: SupaCloudSdkTaskSubmitOptions,
    ): Promise<SupaCloudTaskReceipt<TTask, TUpdate, TWaitOptions>>;
    get(taskId: string): Promise<TTask>;
    list?(params?: Record<string, unknown>): Promise<TTask[]>;
    listDlq?(limit?: number): Promise<TTask[]>;
    cancel?(taskId: string): Promise<unknown>;
    retry?(taskId: string): Promise<unknown>;
    subscribe?(
      taskId: string,
      options: Omit<SupaCloudTaskSubscribeOptions<TUpdate>, 'onUpdate'> & {
        onUpdate: (task: TUpdate) => void;
      },
    ): TaskSubscription | (() => void);
  };
}

type CurrentSupaCloudSdkRootClient = SupaCloudTaskSdkClient<
  SupaCloudSdkTaskRecord,
  SupaCloudTaskSnapshot,
  SupaCloudSdkTaskWaitOptions
>;

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

/** Supported task-client shapes: the legacy root methods or a root SDK client. */
export type SupaCloudTaskClient<TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord> =
  | SupaCloudTaskLegacyClient<TTask>
  | SupaCloudTaskSdkClient<TTask>
  | CurrentSupaCloudSdkRootClient;

interface LegacyTaskProviderOptions<TTask extends SupaCloudTaskRecord> {
  supacloud: SupaCloudTaskLegacyClient<TTask>;
  clientKind?: 'legacy';
}

interface SdkTaskProviderOptions<TTask extends SupaCloudTaskRecord> {
  supacloud:
    | SupaCloudSdkTaskClient
    | SupaCloudTaskSdkClient<TTask>
    | CurrentSupaCloudSdkRootClient;
  clientKind: 'sdk';
}

interface AutoSdkTaskProviderOptions<TTask extends SupaCloudTaskRecord> {
  supacloud: SupaCloudTaskSdkClient<TTask> | CurrentSupaCloudSdkRootClient;
  clientKind?: undefined;
}

export type CreateSupaCloudTaskProviderOptions<
  TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord,
> = LegacyTaskProviderOptions<TTask>
  | SdkTaskProviderOptions<TTask>
  | AutoSdkTaskProviderOptions<TTask>;

interface LegacyTaskLiveProviderOptions<TTask extends SupaCloudTaskRecord> {
  supacloud: Pick<SupaCloudTaskLegacyClient<TTask>, 'subscribe'>;
  clientKind?: 'legacy';
  resource?: string;
  mapTaskToEvent?: (task: TTask, resource: string) => LiveEvent;
}

interface SdkTaskLiveProviderOptions<TTask extends SupaCloudTaskRecord> {
  supacloud:
    | Pick<SupaCloudSdkTaskClient, 'subscribe'>
    | SupaCloudTaskSdkClient<TTask>
    | CurrentSupaCloudSdkRootClient;
  clientKind: 'sdk';
  resource?: string;
  mapTaskToEvent?: (task: TTask, resource: string) => LiveEvent;
}

interface AutoSdkTaskLiveProviderOptions<TTask extends SupaCloudTaskRecord> {
  supacloud: SupaCloudTaskSdkClient<TTask> | CurrentSupaCloudSdkRootClient;
  clientKind?: undefined;
  resource?: string;
  mapTaskToEvent?: (task: TTask, resource: string) => LiveEvent;
}

export type CreateSupaCloudTaskLiveProviderOptions<
  TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord,
> = LegacyTaskLiveProviderOptions<TTask>
  | SdkTaskLiveProviderOptions<TTask>
  | AutoSdkTaskLiveProviderOptions<TTask>;

function normalizeTaskSubscription(subscription: unknown): (() => void) | undefined {
  if (!subscription) return undefined;
  if (typeof subscription === 'function') return subscription as () => void;
  if (
    typeof subscription === 'object'
    && subscription !== null
    && 'unsubscribe' in subscription
    && typeof subscription.unsubscribe === 'function'
  ) {
    const unsubscribe = (subscription as { unsubscribe: () => void }).unsubscribe;
    return () => unsubscribe.call(subscription);
  }
  return undefined;
}

function readSdkTaskSubscription(subscription: unknown, operation: string): () => void {
  const unsubscribe = normalizeTaskSubscription(subscription);
  if (!unsubscribe) {
    throw invalidSdkResponse(operation, 'an invalid task subscription');
  }
  return unsubscribe;
}

function normalizeLegacyTaskList<TTask extends SupaCloudTaskRecord>(
  payload: unknown,
  context: string,
): TaskListResult<TTask> {
  if (Array.isArray(payload)) {
    return { data: payload as TTask[], total: payload.length };
  }
  if (isObjectRecord(payload) && Array.isArray(payload.data)) {
    return { data: payload.data as TTask[], total: payload.data.length };
  }
  throw new Error(`[svadmin/supabase] ${context} returned an invalid task list response`);
}

function invalidSdkResponse(operation: string, reason: string): TypeError {
  return new TypeError(`[svadmin/supabase] SupaCloud SDK ${operation} returned ${reason}`);
}

function isObjectRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

function isSdkRootClient(
  payload: unknown,
): payload is SupaCloudTaskSdkClient {
  return isObjectRecord(payload) && isObjectRecord(payload.tasks);
}

interface ResolvedSdkTaskClient {
  submit(taskName: string, options?: SupaCloudSdkTaskSubmitOptions): Promise<unknown>;
  get(taskId: string): Promise<unknown>;
  list?(params?: Record<string, unknown>): Promise<unknown>;
  listDlq?(limit?: number): Promise<unknown>;
  cancel?(taskId: string): Promise<unknown>;
  retry?(taskId: string): Promise<unknown>;
  subscribe?(
    taskId: string,
    options: Omit<SupaCloudTaskSubscribeOptions<unknown>, 'onUpdate'> & {
      onUpdate: (task: unknown) => void;
    },
  ): unknown;
}

function resolveSdkTaskClient(payload: unknown): ResolvedSdkTaskClient {
  const client = isSdkRootClient(payload) ? payload.tasks : payload;
  return client as ResolvedSdkTaskClient;
}

function nonEmptyString(candidate: unknown): string | undefined {
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : undefined;
}

function readSdkTaskId(
  taskPayload: Record<string, unknown>,
  rawTask: Record<string, unknown>,
  operation: string,
): string {
  const taskId = nonEmptyString(taskPayload.id) ?? nonEmptyString(rawTask.id);
  if (!taskId) throw invalidSdkResponse(operation, 'a task without a non-empty id');
  return taskId;
}

function readSdkTaskStatus(
  taskPayload: Record<string, unknown>,
  rawTask: Record<string, unknown>,
  operation: string,
): string {
  const taskStatus = nonEmptyString(taskPayload.status) ?? nonEmptyString(rawTask.status);
  if (!taskStatus) throw invalidSdkResponse(operation, 'a task without a non-empty status');
  return taskStatus;
}

function validateSdkProgress(
  taskPayload: Record<string, unknown>,
  operation: string,
): void {
  if (
    taskPayload.progress !== undefined
    && taskPayload.progress !== null
    && (typeof taskPayload.progress !== 'number' || !Number.isFinite(taskPayload.progress))
  ) {
    throw invalidSdkResponse(operation, 'a task with invalid progress');
  }
}

function validateSdkError(
  taskPayload: Record<string, unknown>,
  operation: string,
): void {
  const errorPayload = taskPayload.error ?? taskPayload.error_message;
  if (errorPayload !== undefined && errorPayload !== null && typeof errorPayload !== 'string') {
    throw invalidSdkResponse(operation, 'a task with invalid error');
  }
}

function validateSdkUpdatedAt(
  taskPayload: Record<string, unknown>,
  operation: string,
): void {
  const updatedAtPayload = taskPayload.updatedAt ?? taskPayload.updated_at;
  if (updatedAtPayload !== undefined && updatedAtPayload !== null && typeof updatedAtPayload !== 'string') {
    throw invalidSdkResponse(operation, 'a task with invalid updatedAt');
  }
}

function validateOptionalSdkTaskFields(
  taskPayload: Record<string, unknown>,
  operation: string,
): void {
  validateSdkProgress(taskPayload, operation);
  validateSdkError(taskPayload, operation);
  validateSdkUpdatedAt(taskPayload, operation);
}

function readSdkTask<TTask extends SupaCloudTaskRecord>(
  taskPayload: unknown,
  operation: string,
): TTask {
  if (!isObjectRecord(taskPayload)) {
    throw invalidSdkResponse(operation, 'a non-object task payload');
  }
  validateOptionalSdkTaskFields(taskPayload, operation);

  const rawTask = isObjectRecord(taskPayload.raw) ? taskPayload.raw : taskPayload;
  if (rawTask !== taskPayload) validateOptionalSdkTaskFields(rawTask, operation);
  const taskId = readSdkTaskId(taskPayload, rawTask, operation);
  const taskStatus = readSdkTaskStatus(taskPayload, rawTask, operation);

  const normalizedTask: Record<string, unknown> = { ...rawTask, id: taskId, status: taskStatus };
  const taskProgress = taskPayload.progress ?? rawTask.progress;
  if (typeof taskProgress === 'number') normalizedTask.progress = taskProgress;
  else delete normalizedTask.progress;
  if (taskPayload.error === null || typeof taskPayload.error === 'string') {
    normalizedTask.error = taskPayload.error;
  }
  if (taskPayload.updatedAt === null || typeof taskPayload.updatedAt === 'string') {
    normalizedTask.updatedAt = taskPayload.updatedAt;
  }
  return normalizedTask as TTask;
}

function readSdkTaskList<TTask extends SupaCloudTaskRecord>(
  taskListPayload: unknown,
  operation: string,
): TaskListResult<TTask> {
  if (!Array.isArray(taskListPayload)) {
    throw invalidSdkResponse(operation, 'a non-array task list');
  }
  const tasks = taskListPayload.map((task) => readSdkTask<TTask>(task, operation));
  return { data: tasks, total: tasks.length };
}

function assertOptionalReceiptMethod(
  receipt: Record<string, unknown>,
  method: 'cancel' | 'retry' | 'subscribe',
): void {
  if (receipt[method] !== undefined && typeof receipt[method] !== 'function') {
    throw invalidSdkResponse('submit', `a receipt with invalid ${method}`);
  }
}

function readSdkReceipt(receiptPayload: unknown): SupaCloudTaskReceipt {
  if (!isObjectRecord(receiptPayload)) {
    throw invalidSdkResponse('submit', 'a non-object receipt');
  }
  if (!nonEmptyString(receiptPayload.taskId) || typeof receiptPayload.wait !== 'function') {
    throw invalidSdkResponse('submit', 'a receipt without a non-empty taskId and wait method');
  }
  assertOptionalReceiptMethod(receiptPayload, 'cancel');
  assertOptionalReceiptMethod(receiptPayload, 'retry');
  assertOptionalReceiptMethod(receiptPayload, 'subscribe');
  return receiptPayload as unknown as SupaCloudTaskReceipt;
}

function adaptSdkReceipt<TTask extends SupaCloudTaskRecord>(
  receipt: SupaCloudTaskReceipt,
): TaskHandle<TTask> {
  const wait = receipt.wait;
  const taskHandle: TaskHandle<TTask> = {
    id: receipt.taskId,
    wait: async () => readSdkTask<TTask>(
      await wait.call(receipt),
      'receipt.wait',
    ),
  };

  const cancel = receipt.cancel;
  if (cancel) taskHandle.cancel = () => cancel.call(receipt);
  const retry = receipt.retry;
  if (retry) taskHandle.retry = () => retry.call(receipt);
  const subscribe = receipt.subscribe;
  if (subscribe) {
    taskHandle.subscribe = (callback) => readSdkTaskSubscription(
      subscribe.call(receipt, {
        onUpdate: (task) => callback(readSdkTask<TTask>(task, 'receipt.subscribe')),
      }),
      'receipt.subscribe',
    );
  }
  return taskHandle;
}

function toSdkSubmitOptions(
  submitOptions?: SubmitTaskOptions,
): SupaCloudSdkTaskSubmitOptions | undefined {
  if (!submitOptions) return undefined;
  const { meta, ...sharedOptions } = submitOptions;
  return {
    ...sharedOptions,
    ...(meta === undefined ? {} : { metadata: meta }),
  };
}

function readSdkDlqLimit(params?: Record<string, unknown>): number | undefined {
  const limit = params?.limit;
  if (limit === undefined) return undefined;
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    throw new TypeError('[svadmin/supabase] SupaCloud SDK tasks.listDlq requires a finite numeric limit');
  }
  return limit;
}

function createLegacyTaskProvider<TTask extends SupaCloudTaskRecord>(
  supacloud: SupaCloudTaskLegacyClient<TTask>,
): TaskProvider<TTask> {
  return {
    submit: (taskName, submitOptions) => supacloud.submit(taskName, submitOptions),
    get: (taskId) => supacloud.get(taskId),
    async list(params) {
      if (!supacloud.list) {
        throw new Error('[svadmin/supabase] SupaCloud client does not implement tasks.list');
      }
      return normalizeLegacyTaskList(await supacloud.list(params), 'tasks.list');
    },
    async listDlq(params) {
      if (!supacloud.listDlq) {
        throw new Error('[svadmin/supabase] SupaCloud client does not implement tasks.listDlq');
      }
      return normalizeLegacyTaskList(await supacloud.listDlq(params), 'tasks.listDlq');
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

function createSdkTaskProvider<TTask extends SupaCloudTaskRecord>(
  supacloud: unknown,
): TaskProvider<TTask> {
  const sdk = resolveSdkTaskClient(supacloud);
  return {
    async submit(taskName, submitOptions) {
      const receipt = readSdkReceipt(await sdk.submit(
        taskName,
        toSdkSubmitOptions(submitOptions),
      ));
      return adaptSdkReceipt<TTask>(receipt);
    },
    async get(taskId) {
      return readSdkTask<TTask>(await sdk.get(taskId), 'tasks.get');
    },
    async list(params) {
      if (!sdk.list) {
        throw new Error('[svadmin/supabase] SupaCloud SDK client does not implement tasks.list');
      }
      return readSdkTaskList<TTask>(await sdk.list(params), 'tasks.list');
    },
    async listDlq(params) {
      if (!sdk.listDlq) {
        throw new Error('[svadmin/supabase] SupaCloud SDK client does not implement tasks.listDlq');
      }
      return readSdkTaskList<TTask>(
        await sdk.listDlq(readSdkDlqLimit(params)),
        'tasks.listDlq',
      );
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
      return readSdkTaskSubscription(
        sdk.subscribe(taskId, {
          onUpdate: (task) => callback(readSdkTask<TTask>(task, 'tasks.subscribe')),
        }),
        'tasks.subscribe',
      );
    },
  };
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

function requiredLiveTaskId(liveParams?: Record<string, unknown>): string {
  const taskId = nonEmptyString(liveParams?.taskId);
  if (!taskId) {
    throw new Error('[svadmin/supabase] createSupaCloudTaskLiveProvider requires liveParams.taskId');
  }
  return taskId;
}

function createLegacyTaskLiveProvider<TTask extends SupaCloudTaskRecord>(
  options: LegacyTaskLiveProviderOptions<TTask>,
): LiveProvider {
  const resourceName = options.resource ?? 'tasks';
  const mapTaskToEvent = options.mapTaskToEvent ?? defaultMapTaskToEvent<TTask>;
  return {
    subscribe({ resource, liveParams, callback }) {
      if (!options.supacloud.subscribe) {
        throw new Error('[svadmin/supabase] SupaCloud client does not implement tasks.subscribe');
      }
      const taskId = requiredLiveTaskId(liveParams);
      const subscription = options.supacloud.subscribe(taskId, (task) => {
        callback(mapTaskToEvent(task, resource || resourceName));
      });
      return normalizeTaskSubscription(subscription) ?? (() => {});
    },
  };
}

function createSdkTaskLiveProvider<TTask extends SupaCloudTaskRecord>(
  options: {
    supacloud: unknown;
    resource?: string;
    mapTaskToEvent?: (task: TTask, resource: string) => LiveEvent;
  },
): LiveProvider {
  const sdk = resolveSdkTaskClient(options.supacloud);
  const resourceName = options.resource ?? 'tasks';
  const mapTaskToEvent = options.mapTaskToEvent ?? defaultMapTaskToEvent<TTask>;
  return {
    subscribe({ resource, liveParams, callback }) {
      if (!sdk.subscribe) {
        throw new Error('[svadmin/supabase] SupaCloud SDK client does not implement tasks.subscribe');
      }
      const taskId = requiredLiveTaskId(liveParams);
      return readSdkTaskSubscription(
        sdk.subscribe(taskId, {
          onUpdate: (task) => callback(mapTaskToEvent(
            readSdkTask<TTask>(task, 'tasks.subscribe'),
            resource || resourceName,
          )),
        }),
        'tasks.subscribe',
      );
    },
  };
}

export function createSupaCloudTaskProvider<
  TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord,
>(options: CreateSupaCloudTaskProviderOptions<TTask>): TaskProvider<TTask> {
  if (options.clientKind === 'legacy') {
    return createLegacyTaskProvider(options.supacloud);
  }
  if (options.clientKind === 'sdk') {
    return createSdkTaskProvider<TTask>(options.supacloud);
  }
  if (isSdkRootClient(options.supacloud)) {
    return createSdkTaskProvider<TTask>(options.supacloud);
  }
  return createLegacyTaskProvider(options.supacloud as SupaCloudTaskLegacyClient<TTask>);
}

export function createSupaCloudTaskLiveProvider<
  TTask extends SupaCloudTaskRecord = SupaCloudTaskRecord,
>(options: CreateSupaCloudTaskLiveProviderOptions<TTask>): LiveProvider {
  if (options.clientKind === 'legacy') {
    return createLegacyTaskLiveProvider(options);
  }
  if (options.clientKind === 'sdk') {
    return createSdkTaskLiveProvider(options);
  }
  if (isSdkRootClient(options.supacloud)) {
    return createSdkTaskLiveProvider({
      supacloud: options.supacloud,
      resource: options.resource,
      mapTaskToEvent: options.mapTaskToEvent,
    });
  }
  return createLegacyTaskLiveProvider(options as LegacyTaskLiveProviderOptions<TTask>);
}
