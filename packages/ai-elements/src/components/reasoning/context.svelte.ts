import { createContext } from 'svelte';

export interface ReasoningContextValue {
  readonly isStreaming: boolean;
  readonly isOpen: boolean;
  readonly duration: number | undefined;
  setIsOpen(open: boolean): void;
}

const [getReasoningContext, setReasoningContext] = createContext<ReasoningContextValue>();

export function provideReasoningContext(context: ReasoningContextValue): ReasoningContextValue {
  setReasoningContext(context);
  return context;
}

export function useReasoning(): ReasoningContextValue {
  try {
    return getReasoningContext();
  } catch {
    throw new Error('Reasoning components must be used within Reasoning');
  }
}
