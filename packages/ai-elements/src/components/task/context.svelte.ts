import { createContext } from 'svelte';

export interface TaskContextValue {
  readonly open: boolean;
  setOpen(open: boolean): void;
}

const [getTaskContext, setTaskContext] = createContext<TaskContextValue>();

export function provideTaskContext(value: TaskContextValue): TaskContextValue {
  setTaskContext(value);
  return value;
}

export function useTaskContext(component = 'Task component'): TaskContextValue {
  try {
    return getTaskContext();
  } catch {
    throw new Error(`${component} must be used within Task`);
  }
}
