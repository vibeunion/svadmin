import { createContext } from 'svelte';
import type { ToolDisplayState } from './status.js';

export interface ToolContextValue {
  readonly name: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly errorText: string | undefined;
  readonly state: ToolDisplayState;
  readonly open: boolean;
  setOpen(open: boolean): void;
}

const [getToolContext, setToolContext] = createContext<ToolContextValue>();

export function provideToolContext(context: ToolContextValue): ToolContextValue {
  setToolContext(context);
  return context;
}

export function useToolContext(component = 'Tool component'): ToolContextValue {
  try {
    return getToolContext();
  } catch {
    throw new Error(`${component} must be used within Tool`);
  }
}
