import { createContext } from 'svelte';

export interface MessageBranchContextValue {
  readonly currentBranch: number;
  readonly totalBranches: number;
  goToPrevious(): void;
  goToNext(): void;
  setTotalBranches(total: number): void;
}

const [getMessageBranchContext, setMessageBranchContext] = createContext<MessageBranchContextValue>();

export function provideMessageBranchContext(context: MessageBranchContextValue): MessageBranchContextValue {
  setMessageBranchContext(context);
  return context;
}

export function useMessageBranch(component = 'MessageBranch component'): MessageBranchContextValue {
  try {
    return getMessageBranchContext();
  } catch {
    throw new Error(`${component} must be used within MessageBranch`);
  }
}
