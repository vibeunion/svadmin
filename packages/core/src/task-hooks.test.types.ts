import type { useTask, useTaskList, useSubmitTask } from './task-hooks.svelte';
import type { useLogin, useLogout } from './auth-hooks.svelte';

export interface TaskHookState {
  task: ReturnType<typeof useTask>;
  list: ReturnType<typeof useTaskList>;
  submit: ReturnType<typeof useSubmitTask>;
  login: ReturnType<typeof useLogin>;
  logout: ReturnType<typeof useLogout>;
}

type Assert<T extends true> = T;
export type TaskErrorCompatibility = Assert<
  Exclude<ReturnType<typeof useTask>['error'], null> extends Error ? true : false
>;
export type TaskListErrorCompatibility = Assert<
  Exclude<ReturnType<typeof useTaskList>['error'], null> extends Error ? true : false
>;
