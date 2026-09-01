import { createContext } from 'svelte';

export interface ChainOfThoughtContextValue {
  readonly open: boolean;
  readonly contentId: string;
  setOpen(open: boolean): void;
}

const [getContext, setContext] = createContext<ChainOfThoughtContextValue>();

export function provideChainOfThoughtContext(value: ChainOfThoughtContextValue): void {
  setContext(value);
}

export function useChainOfThoughtContext(): ChainOfThoughtContextValue {
  return getContext();
}
