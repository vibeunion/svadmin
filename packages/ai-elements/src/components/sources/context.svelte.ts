import { createContext } from 'svelte';
import type { ChatSource } from '../../contracts.js';

export interface SourcesContextValue {
  readonly sources: ChatSource[];
  readonly open: boolean;
  setOpen(open: boolean): void;
}

const [getSourcesContext, setSourcesContext] = createContext<SourcesContextValue>();

export function provideSourcesContext(context: SourcesContextValue): SourcesContextValue {
  setSourcesContext(context);
  return context;
}

export function useSourcesContext(component = 'Sources component'): SourcesContextValue {
  try {
    return getSourcesContext();
  } catch {
    throw new Error(`${component} must be used within Sources`);
  }
}
