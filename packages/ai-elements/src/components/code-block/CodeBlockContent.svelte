<script lang="ts">
  import { cn } from '../../utils.js';
  import CodeBlockLine from './CodeBlockLine.svelte';
  import { createRawTokens, highlightCode, type TokenizedCode } from './highlight.js';

  let {
    code,
    language,
    showLineNumbers = false,
    class: className = '',
  }: {
    code: string;
    language: string;
    showLineNumbers?: boolean;
    class?: string;
  } = $props();

  let highlightedResult = $state<{ key: string; value: TokenizedCode } | null>(null);
  const requestKey = $derived(`${language}\0${code}`);
  const tokenized = $derived(
    highlightedResult?.key === requestKey ? highlightedResult.value : createRawTokens(code),
  );
  const highlighted = $derived(highlightedResult?.key === requestKey);

  $effect(() => {
    const requestedCode = code;
    const requestedLanguage = language;
    const requestedKey = requestKey;
    let active = true;

    const cached = highlightCode(requestedCode, requestedLanguage, (result) => {
      if (!active) return;
      highlightedResult = { key: requestedKey, value: result };
    });

    highlightedResult = cached ? { key: requestedKey, value: cached } : null;

    return () => {
      active = false;
    };
  });
</script>

<div class="relative overflow-auto" data-language={language}>
  <pre
    class={cn('m-0 min-w-max bg-muted/30 p-4 text-sm text-foreground', className)}
    data-highlighted={highlighted}
  ><code class="font-mono text-sm">{#each tokenized.tokens as line, lineIndex (lineIndex)}<CodeBlockLine tokens={line} lineNumber={lineIndex + 1} {showLineNumbers} />{/each}</code></pre>
</div>
