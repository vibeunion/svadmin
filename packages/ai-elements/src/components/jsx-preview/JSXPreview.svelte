<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { provideJSXPreviewContext } from './context.svelte.js';
  import { completeJsxTags } from './completeJsxTags.js';
  import {
    parseJSXPreview,
    type JSXPreviewBindings,
    type JSXPreviewComponents,
    type JSXPreviewParseResult,
  } from './parser.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'onerror'> & {
    jsx: string;
    isStreaming?: boolean;
    components?: JSXPreviewComponents;
    bindings?: JSXPreviewBindings;
    class?: string;
    children?: Snippet;
    onerror?: (error: Error) => void;
  };

  let {
    jsx,
    isStreaming = false,
    components = {},
    bindings = {},
    class: className = '',
    children,
    onerror,
    ...rest
  }: Props = $props();

  let error = $state<Error | null>(null);
  let errorResult = $state.raw<JSXPreviewParseResult | null>(null);
  let lastReportedError = $state('');
  const processedJsx = $derived(isStreaming ? completeJsxTags(jsx) : jsx);
  const result = $derived(parseJSXPreview(processedJsx, { bindings, components }));
  const currentError = $derived.by(() => {
    if (isStreaming) return null;
    if (!result.ok) return result.error;
    return errorResult === result ? error : null;
  });

  function reportError(nextError: Error): void {
    error = nextError;
    errorResult = result;
  }

  function setError(nextError: Error | null): void {
    error = nextError;
    errorResult = nextError ? result : null;
  }

  $effect(() => {
    const nextError = currentError;
    if (!nextError) {
      lastReportedError = '';
      return;
    }
    const reportKey = `${processedJsx}\u0000${nextError.message}`;
    if (reportKey === lastReportedError) return;
    lastReportedError = reportKey;
    onerror?.(nextError);
  });

  provideJSXPreviewContext({
    get jsx() { return jsx; },
    get processedJsx() { return processedJsx; },
    get isStreaming() { return isStreaming; },
    get components() { return components; },
    get bindings() { return bindings; },
    get result() { return result; },
    get error() { return currentError; },
    setError,
    reportError,
  });
</script>

<div {...rest} class={cn('svadmin-ai svadmin-ai-jsx-preview', className)} data-streaming={isStreaming}>
  {@render children?.()}
</div>
