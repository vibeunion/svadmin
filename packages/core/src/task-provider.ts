import { Type } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import { TaskError, decodeTaskList, decodeTaskRecord, decodeTaskSubmitOptions, type SubmitTaskOptions } from './task-contract';
import { requiredTaskClientMethod, taskClientMethod, taskHandleField, taskHandleMethod, validatedTaskSubscription } from './task-subscription';
import type { TaskHandle, TaskProvider } from './types';

export interface TaskTransport {
  submit(name: string, options?: SubmitTaskOptions): Promise<unknown>;
  get(id: string): Promise<unknown>;
  list?(params?: Record<string, unknown>): Promise<unknown>;
  listDlq?(params?: Record<string, unknown>): Promise<unknown>;
  cancel?(id: string): Promise<unknown>;
  retry?(id: string): Promise<unknown>;
  subscribe?(id: string, callback: (task: unknown) => void, onError?: (error: unknown) => void): unknown;
}

const providers = new WeakMap<TaskTransport, TaskProvider>();
const paramsSchema = Type.Record(Type.String(), Type.Unknown());

export function taskInputText(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  throw new TaskError('INVALID_TASK_INPUT');
}

export function taskQueryParams(value: unknown): Record<string, unknown> {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(paramsSchema, candidate)) return candidate;
  } catch {
    // Query inputs must be detached plain data.
  }
  throw new TaskError('INVALID_TASK_INPUT');
}

async function request(invoke: () => unknown, write = false): Promise<unknown> {
  try { return await invoke(); }
  catch { throw new TaskError('TASK_PROVIDER_FAILED', write); }
}

function handle(value: unknown): TaskHandle {
  const rawId = taskHandleField(value, 'id', true);
  if (typeof rawId !== 'string' || !rawId.trim()) throw new TaskError('INVALID_TASK_RESPONSE', true);
  const id = rawId;
  const wait = taskHandleMethod(value, 'wait', true);
  const result: TaskHandle = {
    id,
    async wait() { return decodeTaskRecord(await request(() => wait()), id); },
  };
  if (taskHandleField(value, 'cancel', true) !== undefined) {
    const cancel = taskHandleMethod(value, 'cancel', true);
    result.cancel = async () => decodeTaskRecord(await request(() => cancel(), true), id, true);
  }
  if (taskHandleField(value, 'retry', true) !== undefined) {
    const retry = taskHandleMethod(value, 'retry', true);
    result.retry = async () => decodeTaskRecord(await request(() => retry(), true), id, true);
  }
  if (taskHandleField(value, 'subscribe', true) !== undefined) {
    const subscribe = taskHandleMethod(value, 'subscribe', true);
    result.subscribe = (callback, onError) => validatedTaskSubscription(
      (onUpdate, onFailure) => subscribe(onUpdate, onFailure),
      value => decodeTaskRecord(value, id), callback, onError,
    );
  }
  return result;
}

export function withValidatedTaskProvider(transport: TaskTransport): TaskProvider {
  const existing = providers.get(transport);
  if (existing) return existing;
  const submit = requiredTaskClientMethod(transport, 'submit');
  const get = requiredTaskClientMethod(transport, 'get');
  const list = taskClientMethod(transport, 'list', true);
  const listDlq = taskClientMethod(transport, 'listDlq', true);
  const cancel = taskClientMethod(transport, 'cancel', true);
  const retry = taskClientMethod(transport, 'retry', true);
  const subscribe = taskClientMethod(transport, 'subscribe', true);
  const provider: TaskProvider = {
    async submit(name, options) {
      const taskName = taskInputText(name);
      const input = options === undefined ? undefined : decodeTaskSubmitOptions(options);
      return handle(await request(() => submit(taskName, input), true));
    },
    async get(taskId) {
      const id = taskInputText(taskId);
      return decodeTaskRecord(await request(() => get(id)), id);
    },
  };
  if (list) provider.list = async params => {
    const input = params === undefined ? undefined : taskQueryParams(params);
    return decodeTaskList(await request(() => list(input)));
  };
  if (listDlq) provider.listDlq = async params => {
    const input = params === undefined ? undefined : taskQueryParams(params);
    return decodeTaskList(await request(() => listDlq(input)));
  };
  if (cancel) provider.cancel = async taskId => {
    const id = taskInputText(taskId);
    return decodeTaskRecord(await request(() => cancel(id), true), id, true);
  };
  if (retry) provider.retry = async taskId => {
    const id = taskInputText(taskId);
    return decodeTaskRecord(await request(() => retry(id), true), id, true);
  };
  if (subscribe) provider.subscribe = (taskId, callback, onError) => {
    const id = taskInputText(taskId);
    return validatedTaskSubscription(
      (onUpdate, onFailure) => subscribe(id, onUpdate, onFailure),
      value => decodeTaskRecord(value, id), callback, onError,
    );
  };
  providers.set(transport, provider);
  providers.set(provider, provider);
  return provider;
}
