import { Type, type Static, type TSchema } from '@sinclair/typebox';
import type { LiveEvent, LiveProvider, TaskHandle, TaskProvider, TaskRecord, SubmitTaskOptions } from '@svadmin/core';
import { definedOptions } from '@svadmin/core/options';
import { checkExact, decodeTaskRecord, decodeTaskSubmitOptions, snapshotPlainData, TaskError, validatedTaskSubscription, taskClientField, requiredTaskClientMethod } from '@svadmin/core/schema';

const text = Type.String({ minLength: 1 });
const idSchema = Type.String({ pattern: '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' });
const nameSchema = Type.String({ pattern: '^[A-Za-z0-9][A-Za-z0-9_.-]*(/[A-Za-z0-9][A-Za-z0-9_.-]*)*$' });
const statusSchema = Type.Union([
  Type.Literal('pending'), Type.Literal('leased'), Type.Literal('running'),
  Type.Literal('retry_scheduled'), Type.Literal('succeeded'), Type.Literal('failed'),
  Type.Literal('dead_lettered'), Type.Literal('cancelled'), Type.Literal('queued'),
  Type.Literal('processing'), Type.Literal('completed'), Type.Literal('enqueued'),
]);
const filterValue = Type.Union([text, Type.Array(text, { minItems: 1 })]);
const limitSchema = Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER });
const listSchema = Type.Object({
  status: Type.Optional(filterValue), taskType: Type.Optional(filterValue),
  functionSlug: Type.Optional(text), dlq: Type.Optional(Type.Boolean()), limit: Type.Optional(limitSchema),
}, { additionalProperties: false });
const dlqSchema = Type.Object({ limit: Type.Optional(limitSchema) }, { additionalProperties: false });
const snapshotSchema = Type.Object({
  id: idSchema, status: statusSchema, raw: Type.Unknown(),
  progress: Type.Optional(Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()])),
  error: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  updatedAt: Type.Optional(Type.Union([text, Type.Null()])),
}, { additionalProperties: false });
const liveParamsSchema = Type.Object({ taskId: idSchema }, { additionalProperties: false });
const eventSchema = Type.Object({
  type: Type.Union([Type.Literal('INSERT'), Type.Literal('UPDATE'), Type.Literal('DELETE')]),
  resource: text, payload: Type.Record(Type.String(), Type.Unknown()),
}, { additionalProperties: false });
const terminal = new Set<string>(['succeeded', 'failed', 'dead_lettered', 'cancelled', 'completed']);

export type SupaCloudTaskRecord = TaskRecord & { status: Static<typeof statusSchema> };
export type SupaCloudTaskListParams = Static<typeof listSchema>;
export type SupaCloudTaskDlqParams = Static<typeof dlqSchema>;

export interface SupaCloudTaskSdkSubmitOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface SupaCloudTaskSubscribeOptions {
  onUpdate: (snapshot: unknown) => void;
  onError: (error: unknown) => void;
}

/** SDK values stay unknown until their matching request/receipt is validated. */
export interface SupaCloudTaskClient {
  tasks: {
    submit(name: string, options?: SupaCloudTaskSdkSubmitOptions): Promise<unknown>;
    get(id: string): Promise<unknown>;
    list(params?: SupaCloudTaskListParams): Promise<unknown>;
    listDlq(limit?: number): Promise<unknown>;
    cancel(id: string): Promise<unknown>;
    retry(id: string): Promise<unknown>;
    subscribe(id: string, options: SupaCloudTaskSubscribeOptions): unknown;
  };
}

export interface SupaCloudTaskHandle extends TaskHandle<SupaCloudTaskRecord> {
  id: string;
  cancel(): Promise<SupaCloudTaskRecord>;
  retry(): Promise<SupaCloudTaskRecord>;
  subscribe(callback: (task: SupaCloudTaskRecord) => void, onError?: (error: TaskError) => void): () => void;
}

export interface SupaCloudTaskProvider extends TaskProvider<SupaCloudTaskRecord> {
  submit(name: string, options?: SubmitTaskOptions): Promise<SupaCloudTaskHandle>;
  list(params?: SupaCloudTaskListParams): Promise<{ data: SupaCloudTaskRecord[]; total: number }>;
  listDlq(params?: SupaCloudTaskDlqParams): Promise<{ data: SupaCloudTaskRecord[]; total: number }>;
  cancel(id: string): Promise<SupaCloudTaskRecord>;
  retry(id: string): Promise<SupaCloudTaskRecord>;
  subscribe(id: string, callback: (task: SupaCloudTaskRecord) => void, onError?: (error: TaskError) => void): () => void;
}

export interface CreateSupaCloudTaskProviderOptions {
  supacloud: SupaCloudTaskClient;
  onError?: (error: TaskError) => void;
}

export interface CreateSupaCloudTaskLiveProviderOptions {
  supacloud: { tasks: Pick<SupaCloudTaskClient['tasks'], 'subscribe'> };
  resource?: string;
  mapTaskToEvent?: (task: SupaCloudTaskRecord, resource: string) => unknown;
  onError?: (error: TaskError) => void;
}

function decode<S extends TSchema>(schema: S, value: unknown, input = false, write = false): Static<S> {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(schema, candidate)) return candidate;
  } catch {
    // Reflection and raw SDK errors must not escape this boundary.
  }
  throw new TaskError(input ? 'INVALID_TASK_INPUT' : 'INVALID_TASK_RESPONSE', write);
}

function taskRecord(value: unknown, id?: string, write = false): SupaCloudTaskRecord {
  const task = decodeTaskRecord(value, id, write);
  decode(idSchema, task.id, false, write);
  return { ...task, status: decode(statusSchema, task.status, false, write) };
}

function taskSnapshot(value: unknown, id: string): SupaCloudTaskRecord {
  const snapshot = decode(snapshotSchema, value);
  const task = taskRecord(snapshot.raw, id);
  const expectedError = typeof task.error === 'string' ? task.error : task.error_message ?? null;
  const expectedDate = task.updated_at ?? task.updatedAt ?? null;
  if (snapshot.id !== task.id || snapshot.status !== task.status
    || snapshot.progress !== undefined && snapshot.progress !== (task.progress ?? null)
    || snapshot.error !== undefined && snapshot.error !== expectedError
    || snapshot.updatedAt !== undefined && snapshot.updatedAt !== expectedDate) {
    throw new TaskError('INVALID_TASK_RESPONSE');
  }
  return task;
}

function ownField(value: unknown, key: string, write = false): unknown {
  try {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && 'value' in descriptor) {
        const field: unknown = descriptor.value;
        return field;
      }
    }
  } catch {
    // Never invoke receipt or subscription accessors.
  }
  throw new TaskError('INVALID_TASK_RESPONSE', write);
}

function method(value: unknown, key: string, write = false): (...args: unknown[]) => unknown {
  const callable = ownField(value, key, write);
  if (typeof callable !== 'function') throw new TaskError('INVALID_TASK_RESPONSE', write);
  return (...args) => {
    const result: unknown = Reflect.apply(callable, value, args);
    return result;
  };
}

async function request(invoke: () => unknown, write = false): Promise<unknown> {
  try { return await invoke(); }
  catch { throw new TaskError('TASK_PROVIDER_FAILED', write); }
}

function listen(
  start: (options: SupaCloudTaskSubscribeOptions) => unknown,
  id: string,
  callback: (task: SupaCloudTaskRecord) => void,
  onError?: (error: TaskError) => void,
): () => void {
  return validatedTaskSubscription(
    (onUpdate, onFailure) => start({ onUpdate, onError: onFailure }),
    value => taskSnapshot(value, id), callback, onError,
  );
}

function submitOptions(value: SubmitTaskOptions | undefined): SupaCloudTaskSdkSubmitOptions {
  const input = decodeTaskSubmitOptions(value === undefined ? {} : value);
  try {
    if (input.headers) {
      const headers = new Headers(input.headers);
      if (headers.has('x-supacloud-task-metadata') || headers.has('x-supacloud-idempotency-key')) {
        throw new TaskError('INVALID_TASK_INPUT');
      }
    }
    if (input.idempotencyKey !== undefined) {
      if (!input.idempotencyKey.trim()) throw new TaskError('INVALID_TASK_INPUT');
      new Headers({ 'x-supacloud-idempotency-key': input.idempotencyKey });
    }
  } catch { throw new TaskError('INVALID_TASK_INPUT'); }
  return definedOptions({
    body: input.body, headers: input.headers, idempotencyKey: input.idempotencyKey, metadata: input.meta,
  });
}

function receipt(value: unknown, onError?: (error: TaskError) => void): SupaCloudTaskHandle {
  const id = decode(idSchema, ownField(value, 'taskId', true), false, true);
  decode(statusSchema, ownField(value, 'status', true), false, true);
  const wait = method(value, 'wait', true);
  const cancel = method(value, 'cancel', true);
  const retry = method(value, 'retry', true);
  const subscribe = method(value, 'subscribe', true);
  return {
    id,
    async wait() {
      const task = taskRecord(await request(() => wait()), id);
      if (!terminal.has(task.status)) throw new TaskError('INVALID_TASK_RESPONSE');
      return task;
    },
    async cancel() { return taskRecord(await request(() => cancel(), true), id, true); },
    async retry() { return taskRecord(await request(() => retry(), true), id, true); },
    subscribe(callback, subscriptionError) {
      return listen(options => subscribe(options), id, callback, subscriptionError ?? onError);
    },
  };
}

export function createSupaCloudTaskProvider(options: CreateSupaCloudTaskProviderOptions): SupaCloudTaskProvider {
  const sdk = taskClientField(taskClientField(options, 'supacloud'), 'tasks');
  const submit = requiredTaskClientMethod(sdk, 'submit');
  const get = requiredTaskClientMethod(sdk, 'get');
  const list = requiredTaskClientMethod(sdk, 'list');
  const listDlq = requiredTaskClientMethod(sdk, 'listDlq');
  const cancel = requiredTaskClientMethod(sdk, 'cancel');
  const retry = requiredTaskClientMethod(sdk, 'retry');
  const subscribe = requiredTaskClientMethod(sdk, 'subscribe');
  const onError = errorCallback(taskClientField(options, 'onError'));
  const listResult = (value: unknown) => {
    const values = decode(Type.Array(Type.Unknown()), value);
    const data = values.map(value => taskRecord(value));
    return { data, total: data.length };
  };
  return {
    async submit(name, options) {
      const taskName = decode(nameSchema, name, true);
      const params = submitOptions(options);
      return receipt(await request(() => submit(taskName, params), true), onError);
    },
    async get(taskId) {
      const id = decode(idSchema, taskId, true);
      return taskRecord(await request(() => get(id)), id);
    },
    async list(params) {
      const input = decode(listSchema, params === undefined ? {} : params, true);
      return listResult(await request(() => list(input)));
    },
    async listDlq(params) {
      const input = decode(dlqSchema, params === undefined ? {} : params, true);
      return listResult(await request(() => listDlq(input.limit)));
    },
    async cancel(taskId) {
      const id = decode(idSchema, taskId, true);
      return taskRecord(await request(() => cancel(id), true), id, true);
    },
    async retry(taskId) {
      const id = decode(idSchema, taskId, true);
      return taskRecord(await request(() => retry(id), true), id, true);
    },
    subscribe(taskId, callback, subscriptionError) {
      const id = decode(idSchema, taskId, true);
      return listen(options => subscribe(id, options), id, callback, subscriptionError ?? onError);
    },
  };
}

function errorCallback(value: unknown): ((error: TaskError) => unknown) | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'function') throw new TaskError('INVALID_TASK_INPUT');
  return error => { const result: unknown = Reflect.apply(value, undefined, [error]); return result; };
}

export function createSupaCloudTaskLiveProvider(options: CreateSupaCloudTaskLiveProviderOptions): LiveProvider {
  const sdk = taskClientField(taskClientField(options, 'supacloud'), 'tasks');
  const subscribe = requiredTaskClientMethod(sdk, 'subscribe');
  const resource = taskClientField(options, 'resource');
  const resourceName = decode(text, resource === undefined ? 'tasks' : resource, true);
  const map = taskClientField(options, 'mapTaskToEvent');
  if (map !== undefined && typeof map !== 'function') throw new TaskError('INVALID_TASK_INPUT');
  const onError = errorCallback(taskClientField(options, 'onError'));
  return {
    subscribe({ resource, liveParams, callback }) {
      const resourceId = decode(text, resource === undefined ? resourceName : resource, true);
      const { taskId } = decode(liveParamsSchema, liveParams, true);
      return validatedTaskSubscription(
        (onUpdate, onError) => subscribe(taskId, { onUpdate, onError }),
        value => {
          const task = taskSnapshot(value, taskId);
          let mapped: unknown;
          try {
            mapped = map ? Reflect.apply(map, undefined, [task, resourceId]) : { type: 'UPDATE', resource: resourceId, payload: task };
          } catch { throw new TaskError('TASK_CALLBACK_FAILED'); }
          const event: LiveEvent = decode(eventSchema, mapped);
          if (event.resource !== resourceId) throw new TaskError('INVALID_TASK_RESPONSE');
          return event;
        },
        callback, onError,
      );
    },
  };
}
