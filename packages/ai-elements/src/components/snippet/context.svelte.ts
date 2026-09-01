import { getContext, hasContext, setContext } from 'svelte';

const SNIPPET_CONTEXT = Symbol('svadmin-ai-snippet');

export interface SnippetContextValue {
  readonly code: string;
}

export function provideSnippetContext(context: SnippetContextValue): SnippetContextValue {
  setContext(SNIPPET_CONTEXT, context);
  return context;
}

export function useSnippetContext(componentName: string): SnippetContextValue {
  if (!hasContext(SNIPPET_CONTEXT)) {
    throw new Error(`${componentName} must be used within Snippet`);
  }
  return getContext<SnippetContextValue>(SNIPPET_CONTEXT);
}
