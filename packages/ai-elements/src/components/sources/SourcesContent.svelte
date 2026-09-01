<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { useSourcesContext } from './context.svelte.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & { class?: string; children?: Snippet };
  let { class: className = '', children, ...rest }: Props = $props();
  const sources = useSourcesContext('SourcesContent');
</script>

{#if sources.open}
  <div {...rest} class={cn('svadmin-ai-sources-content', className)} data-slot="sources-content">
    {@render children?.()}
  </div>
{/if}

<style>
  .svadmin-ai-sources-content { display: flex; width: fit-content; flex-direction: column; gap: 0.5rem; border-top: 1px solid var(--border, currentColor); padding: 0.75rem; }
</style>
