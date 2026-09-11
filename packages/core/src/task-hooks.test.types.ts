import type { useTask, useTaskList, useSubmitTask } from './task-hooks.svelte';

export interface TaskHookState {
  task: ReturnType<typeof useTask>;
  list: ReturnType<typeof useTaskList>;
  submit: ReturnType<typeof useSubmitTask>;
}
