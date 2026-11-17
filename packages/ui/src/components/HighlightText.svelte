<script lang="ts">
  import { cn } from '../utils.js';
  import { splitHighlights } from './highlight.js';

  interface Props {
    text: string;
    /** One term or a list of terms to highlight. */
    query?: string | readonly string[];
    /** Keyword alias for query */
    keyword?: string | readonly string[];
    /** Keywords alias for query */
    keywords?: string | readonly string[];
    caseSensitive?: boolean;
    wholeWord?: boolean;
    class?: string;
    /** Overrides the `<mark>` styling without leaving the semantic token system. */
    highlightClass?: string;
    /** Alias for highlightClass */
    highlightClassName?: string;
  }

  let {
    text,
    query,
    keyword,
    keywords,
    caseSensitive = false,
    wholeWord = false,
    class: className = '',
    highlightClass = '',
    highlightClassName = '',
  }: Props = $props();

  const effectiveQuery = $derived(query ?? keyword ?? keywords);
  const effectiveHighlightClass = $derived(highlightClassName || highlightClass);

  const segments = $derived(
    splitHighlights(text, effectiveQuery, { caseSensitive, wholeWord }),
  );
</script>

<span class={cn('svadmin-highlight-text', className)} data-slot="highlight-text">
  {#each segments as segment, index (index)}{#if segment.match}<mark class={cn('svadmin-highlight-text__mark', effectiveHighlightClass)}>{segment.text}</mark>{:else}{segment.text}{/if}{/each}
</span>

<style>
  .svadmin-highlight-text {
    color: inherit;
    overflow-wrap: anywhere;
  }

  .svadmin-highlight-text__mark {
    border-radius: 0.2rem;
    padding-inline: 0.1rem;
    background: color-mix(in oklch, var(--warning, var(--primary, currentColor)) 28%, transparent);
    color: var(--foreground, currentColor);
  }
</style>
