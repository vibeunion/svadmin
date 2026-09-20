import type { useTask, useTaskList, useSubmitTask } from './task-hooks.svelte';
import type { useLogin, useLogout } from './auth-hooks.svelte';

export interface TaskHookState {
  task: ReturnType<typeof useTask>;
  list: ReturnType<typeof useTaskList>;
  submit: ReturnType<typeof useSubmitTask>;
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
}
