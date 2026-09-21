<script lang="ts">
  import { useTask, useTaskList, useSubmitTask, useTaskSubscription } from './task-hooks.svelte';
  import type { TaskHookState } from './task-hooks.test.types';
  import type { TaskProvider, TaskRecord } from './types';
  import type { TaskError } from './task-contract';
  import { definedReactiveOptions } from './defined-options';
  import { useLogin, useLogout } from './auth-hooks.svelte';

  let { provider, taskId, queryParams, dlq = false, enabled = true, onTask, onError, onReady, notifyReads, refetchInterval,
    onSubmitSuccess, onSubmitError }: {
    provider?: TaskProvider;
    taskId: string;
    enabled?: boolean;
    queryParams?: Record<string, unknown>;
    dlq?: boolean;
    onTask?: (task: TaskRecord) => void;
    onError?: (error: TaskError) => void;
    onReady: (state: TaskHookState) => void;
    notifyReads: boolean;
    refetchInterval: number | false;
    onSubmitSuccess?: () => void;
    onSubmitError?: () => void;
  } = $props();
  const task = useTask(definedReactiveOptions({
    get taskId() { return taskId; },
    get taskProvider() { return provider; },
    get queryOptions() { return { enabled, refetchInterval, staleTime: Infinity }; },
    get successNotification() { return notifyReads ? 'Task read' : false; },
    get errorNotification() { return notifyReads ? 'Task read failed' : false; },
  }));
  const list = useTaskList(definedReactiveOptions({
    get dlq() { return dlq; },
    get params() { return queryParams ?? {}; },
    get taskProvider() { return provider; },
    get queryOptions() { return { enabled, refetchInterval, staleTime: Infinity }; },
    get successNotification() { return notifyReads ? 'Tasks read' : false; },
    get errorNotification() { return notifyReads ? 'Tasks read failed' : false; },
  }));
  const submit = useSubmitTask({ mutationOptions: {
    onSuccess: () => onSubmitSuccess?.(),
    onError: () => onSubmitError?.(),
  } });
  const login = useLogin({ successNotification: false, errorNotification: false });
  const logout = useLogout();
  useTaskSubscription(definedReactiveOptions({
    get taskId() { return taskId; },
    get taskProvider() { return provider; },
    get enabled() { return onTask !== undefined; },
    onTask: (task: TaskRecord) => onTask?.(task),
    onError: (error: TaskError) => onError?.(error),
  }));
  $effect(() => onReady({ task, list, submit, login, logout }));
</script>

<output data-testid="task-id">{task.data?.id ?? ''}</output>
<output data-testid="task-total">{list.data?.total ?? 0}</output>
