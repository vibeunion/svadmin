import { createContext } from 'svelte';
import type {
  JSXPreviewBindings,
  JSXPreviewComponents,
  JSXPreviewParseResult,
} from './parser.js';

export interface JSXPreviewContextValue {
  readonly jsx: string;
  readonly processedJsx: string;
  readonly isStreaming: boolean;
  readonly components: JSXPreviewComponents;
  readonly bindings: JSXPreviewBindings;
  readonly result: JSXPreviewParseResult;
  readonly error: Error | null;
  setError(error: Error | null): void;
  reportError(error: Error): void;
}

const [getJSXPreviewContext, setJSXPreviewContext] = createContext<JSXPreviewContextValue>();

export function provideJSXPreviewContext(value: JSXPreviewContextValue): void {
  setJSXPreviewContext(value);
}

export function useJSXPreviewContext(): JSXPreviewContextValue {
  const context = getJSXPreviewContext();
  if (!context) throw new Error('JSXPreview components must be used within JSXPreview');
  return context;
}
