import { createContext } from 'svelte';

export interface PlanContextValue {
  readonly isStreaming: boolean;
  readonly open: boolean;
  setOpen(open: boolean): void;
}

const [getPlanContext, setPlanContext] = createContext<PlanContextValue>();

export function providePlanContext(value: PlanContextValue): PlanContextValue {
  setPlanContext(value);
  return value;
}

export function usePlanContext(component = 'Plan component'): PlanContextValue {
  try {
    return getPlanContext();
  } catch {
    throw new Error(`${component} must be used within Plan`);
  }
}
