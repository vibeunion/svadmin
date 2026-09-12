<script lang="ts">
  import { useTask, useTaskList, useSubmitTask, useTaskSubscription } from './task-hooks.svelte';
  import type { TaskHookState } from './task-hooks.test.types';
  import type { TaskProvider, TaskRecord } from './types';
  import type { TaskError } from './task-contract';
  import { definedReactiveOptions } from './defined-options';

  let { provider, taskId, queryParams, enabled = true, onTask, onError, onReady }: {
    provider?: TaskProvider;
    taskId: string;
    enabled?: boolean;
    queryParams?: Record<string, unknown>;
    onTask?: (task: TaskRecord) => void;
    onError?: (error: TaskError) => void;
    onReady: (state: TaskHookState) => void;
  } = $props();
  const task = useTask(definedReactiveOptions({
    get taskId() { return taskId; },
    get taskProvider() { return provider; },
    get queryOptions() { return { enabled }; },
  }));
  const list = useTaskList(definedReactiveOptions({
    get params() { return queryParams ?? {}; },
    get taskProvider() { return provider; },
    get queryOptions() { return { enabled }; },
  }));
  const submit = useSubmitTask();
  useTaskSubscription(definedReactiveOptions({
    get taskId() { return taskId; },
    get taskProvider() { return provider; },
    get enabled() { return onTask !== undefined; },
    onTask: (task: TaskRecord) => onTask?.(task),
    onError: (error: TaskError) => onError?.(error),
  }));
  $effect(() => onReady({ task, list, submit }));
</script>

<output data-testid="task-id">{task.data?.id ?? ''}</output>
<output data-testid="task-total">{list.data?.total ?? 0}</output>
