import { createSupaCloudClient } from '@supacloud/js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TaskProvider, TaskRecord, TaskHandle } from '../../../packages/core/src/types';
import { useTask, useTaskList } from '../../../packages/core/src/task-hooks.svelte';
import {
  createSupaCloudTaskProvider, createSupaCloudTaskLiveProvider,
} from '../../../packages/supabase/src/supacloud';

declare const supabase: SupabaseClient;
const sdk = createSupaCloudClient({
  supabase, managementApiUrl: 'https://management.example.test',
  projectRef: 'project', getAccessToken: () => 'test-token',
});
const provider = createSupaCloudTaskProvider({ supacloud: sdk });
const base: TaskProvider = provider;
createSupaCloudTaskLiveProvider({ supacloud: sdk });
provider.subscribe('task-1', task => {
  const progress: number | null | undefined = task.progress;
  // @ts-expect-error Business-specific task results are not caller-selected types.
  const result: { output: string } = task.result;
  void [progress, result];
});
provider.list({ status: ['running', 'pending'], limit: 20 });
// @ts-expect-error Task IDs must be strings, not silently coerced numeric values.
provider.get(42);
// @ts-expect-error Closed SDK filters do not silently ignore tenant-specific parameters.
provider.list({ tenantId: 'other' });
// @ts-expect-error DLQ accepts only its actual SDK limit parameter.
provider.listDlq({ status: 'failed' });
// @ts-expect-error Optional submission values are omitted rather than explicit undefined.
provider.submit('function', { meta: undefined });
// @ts-expect-error Caller-selected response generics are removed.
createSupaCloudTaskProvider<{ id: string; secret: string }>({ supacloud: sdk });
// @ts-expect-error Bare legacy clients are not the modern SDK contract.
createSupaCloudTaskProvider({ supacloud: { submit: sdk.tasks.submit, get: sdk.tasks.get } });
// @ts-expect-error Incomplete modern SDK clients cannot claim all task capabilities.
createSupaCloudTaskProvider({ supacloud: { tasks: { get: sdk.tasks.get } } });
// @ts-expect-error The live bridge also requires the modern nested client.
createSupaCloudTaskLiveProvider({ supacloud: { subscribe: sdk.tasks.subscribe } });
// @ts-expect-error Task dates are JSON strings, not native date objects.
const dated: TaskRecord = { id: 'task', createdAt: new Date() };
void [base, dated];
// @ts-expect-error Submission handles require a confirmed ID.
const missingId: TaskHandle = { wait: async () => ({ id: 'task' }) };
// @ts-expect-error Cancellation must return a task record, not a success-shaped void.
const emptyCancel: TaskProvider = { ...provider, cancel: async () => {} };
// @ts-expect-error Retrying cannot return an arbitrary payload.
const invalidRetry: TaskProvider = { ...provider, retry: async () => ({ ok: true }) };
// @ts-expect-error Hook task output comes from the validated contract.
useTask<{ id: string; secret: string }>({ taskId: 'task' });
// @ts-expect-error List hook output is not caller-selected.
useTaskList<{ id: string; secret: string }>({});
void [missingId, emptyCancel, invalidRetry];
