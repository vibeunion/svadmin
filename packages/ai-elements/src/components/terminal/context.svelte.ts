import { createContext } from 'svelte';
import type { TerminalLine } from './Terminal.svelte';

export interface TerminalContextValue {
  readonly output: string;
  readonly lines: TerminalLine[];
  readonly isStreaming: boolean;
  readonly autoScroll: boolean;
  readonly onClear?: () => void;
}

const [getTerminalContext, setTerminalContext] = createContext<TerminalContextValue>();

export function provideTerminalContext(value: TerminalContextValue): TerminalContextValue {
  setTerminalContext(value);
  return value;
}

export function useTerminalContext(component = 'Terminal component'): TerminalContextValue {
  try { return getTerminalContext(); } catch { throw new Error(`${component} must be used within Terminal`); }
}
