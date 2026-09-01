import { createContext } from 'svelte';

export interface ContextUsage {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
}

export interface ContextContextValue {
  readonly usedTokens: number;
  readonly maxTokens: number;
  readonly usage?: ContextUsage;
  readonly modelId?: string;
  readonly cost?: number;
  readonly currency: string;
  readonly open: boolean;
  setOpen(open: boolean): void;
}

const [getContextContext, setContextContext] = createContext<ContextContextValue>();

export function provideContextContext(value: ContextContextValue): ContextContextValue {
  setContextContext(value);
  return value;
}

export function useContextContext(component = 'Context component'): ContextContextValue {
  try {
    return getContextContext();
  } catch {
    throw new Error(`${component} must be used within Context`);
  }
}

export function formatContextTokens(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
