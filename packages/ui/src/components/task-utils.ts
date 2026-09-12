import type { TaskRecord } from '@svadmin/core';

export type TaskLifecycle =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unknown';

const STATUS_ALIASES: Record<string, TaskLifecycle> = {
  pending: 'queued',
  queued: 'queued',
  retry_scheduled: 'queued',
  scheduled: 'queued',
  leased: 'processing',
  running: 'processing',
  processing: 'processing',
  active: 'processing',
  completed: 'completed',
  complete: 'completed',
  success: 'completed',
  succeeded: 'completed',
  done: 'completed',
  failed: 'failed',
  error: 'failed',
  dead_lettered: 'failed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  aborted: 'cancelled',
};

export function normalizeTaskStatus(status: unknown): TaskLifecycle {
  if (typeof status !== 'string') return 'unknown';
  const value = status.trim().toLowerCase();
  return Object.hasOwn(STATUS_ALIASES, value) ? STATUS_ALIASES[value] ?? 'unknown' : 'unknown';
}

export function isTaskActive(task: TaskRecord): boolean {
  const lifecycle = normalizeTaskStatus(task.status);
  return lifecycle === 'queued' || lifecycle === 'processing';
}

export function canCancelTask(task: TaskRecord): boolean {
  return isTaskActive(task);
}

export function canRetryTask(task: TaskRecord): boolean {
  return normalizeTaskStatus(task.status) === 'failed';
}

export function resolveTaskTitle(task: TaskRecord): string {
  return String(task.title ?? task.name ?? task.id);
}

export function resolveTaskMessage(task: TaskRecord): string | undefined {
  const message = task.message ?? task.errorMessage ?? task.error_message;
  return message === undefined || message === null ? undefined : String(message);
}

export function resolveTaskUpdatedAt(task: TaskRecord): unknown {
  return (
    task.updatedAt ??
    task.updated_at ??
    task.finishedAt ??
    task.finished_at ??
    task.startedAt ??
    task.started_at ??
    task.createdAt ??
    task.created_at
  );
}

export function resolveTaskCreatedAt(task: TaskRecord): unknown {
  return task.createdAt ?? task.created_at;
}

export function resolveTaskQueueName(task: TaskRecord): string {
  return String(task.queueName ?? task.queue_name ?? '');
}

export function resolveTaskResult(task: TaskRecord): unknown {
  return task.result ?? task.result_data;
}

export function resolveTaskError(task: TaskRecord): unknown {
  return task.error ?? task.errorMessage ?? task.error_message;
}

export function resolveTaskProgress(task: TaskRecord): number | undefined {
  if (typeof task.progress !== 'number' || !Number.isFinite(task.progress)) {
    return normalizeTaskStatus(task.status) === 'completed' ? 100 : undefined;
  }
  return Math.max(0, Math.min(100, Math.round(task.progress)));
}
