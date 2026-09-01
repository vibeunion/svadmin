<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type ModelSelectorEmptyProps = Omit<HTMLAttributes<HTMLParagraphElement>, 'children' | 'class'> & { class?: string; children?: Snippet };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { useModelSelectorContext } from './context.svelte.js';
  let { class: className = '', children, ...rest }: ModelSelectorEmptyProps = $props();
  const context = useModelSelectorContext('ModelSelectorEmpty');
</script>

{#if context.visibleCount === 0}
  <p {...rest} class={cn('svadmin-ai-model-selector-empty', className)} data-slot="model-selector-empty" role="status">
    {#if children}{@render children()}{:else}No models found.{/if}
  </p>
{/if}

<style>
  .svadmin-ai-model-selector-empty { margin: 0; padding: 1rem .5rem; color: var(--muted-foreground, currentColor); font-size: .8125rem; text-align: center; }
</style>
