import { Type, type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';

const text = Type.String({ minLength: 1 });
const dateValue = Type.Union([text, Type.Null()]);
const messageValue = Type.Union([Type.String(), Type.Null()]);
const record = Type.Record(Type.String(), Type.Unknown());
const taskSchema = Type.Intersect([
  Type.Object({
    id: text,
    name: Type.Optional(text), title: Type.Optional(text), status: Type.Optional(text),
    progress: Type.Optional(Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()])),
    priority: Type.Optional(Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })),
    queueName: Type.Optional(text), queue_name: Type.Optional(text),
    message: Type.Optional(messageValue),
    payload: Type.Optional(Type.Unknown()), result: Type.Optional(Type.Unknown()), result_data: Type.Optional(Type.Unknown()),
    createdAt: Type.Optional(dateValue), created_at: Type.Optional(dateValue),
    updatedAt: Type.Optional(dateValue), updated_at: Type.Optional(dateValue),
    startedAt: Type.Optional(dateValue), started_at: Type.Optional(dateValue),
    finishedAt: Type.Optional(dateValue), finished_at: Type.Optional(dateValue),
    cancelledAt: Type.Optional(dateValue), cancelled_at: Type.Optional(dateValue),
    error: Type.Optional(Type.Unknown()),
    errorMessage: Type.Optional(messageValue), error_message: Type.Optional(messageValue),
  }),
  record,
]);
const submitSchema = Type.Object({
  body: Type.Optional(record),
  idempotencyKey: Type.Optional(text),
  headers: Type.Optional(Type.Record(Type.String(), Type.String())),
  meta: Type.Optional(record),
}, { additionalProperties: false });
const listSchema = Type.Object({
  data: Type.Array(taskSchema),
  total: Type.Optional(Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })),
}, { additionalProperties: false });

export type TaskRecord = Static<typeof taskSchema>;
export type TaskDateValue = Static<typeof dateValue>;
export type TaskMessageValue = Static<typeof messageValue>;
export type SubmitTaskOptions = Static<typeof submitSchema>;

const messages = {
  INVALID_TASK_INPUT: 'Invalid task input.',
  INVALID_TASK_RESPONSE: 'Invalid task response.',
  TASK_PROVIDER_FAILED: 'Task request failed.',
  TASK_SUBSCRIPTION_FAILED: 'Task subscription failed.',
  TASK_CALLBACK_FAILED: 'Task callback failed.',
} as const;

export class TaskError extends Error {
  constructor(readonly code: keyof typeof messages, readonly writeMayHaveSucceeded = false) {
    super(messages[code]);
    this.name = 'TaskError';
  }
}

export function decodeTaskRecord(value: unknown, expectedId?: string, write = false): TaskRecord {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(taskSchema, candidate) && (expectedId === undefined || candidate.id === expectedId)) return candidate;
  } catch {
    // Do not expose submitted records or reflection errors.
  }
  throw new TaskError('INVALID_TASK_RESPONSE', write);
}

export function decodeTaskList(value: unknown): Static<typeof listSchema> {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(listSchema, candidate)) return candidate;
  } catch {
    // Normalize reflection and serialization failures.
  }
  throw new TaskError('INVALID_TASK_RESPONSE');
}

export function decodeTaskSubmitOptions(value: unknown): SubmitTaskOptions {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(submitSchema, candidate)) return candidate;
  } catch {
    // Optional fields must be omitted, not serialized as undefined.
  }
  throw new TaskError('INVALID_TASK_INPUT');
}
