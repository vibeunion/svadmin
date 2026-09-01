import { createContext } from 'svelte';

export interface QueueSectionContextValue {
  readonly open: boolean;
  setOpen(open: boolean): void;
}

const [getQueueSectionContext, setQueueSectionContext] = createContext<QueueSectionContextValue>();

export function provideQueueSectionContext(value: QueueSectionContextValue): QueueSectionContextValue {
  setQueueSectionContext(value);
  return value;
}

export function useQueueSectionContext(component = 'QueueSection component'): QueueSectionContextValue {
  try {
    return getQueueSectionContext();
  } catch {
    throw new Error(`${component} must be used within QueueSection`);
  }
}
