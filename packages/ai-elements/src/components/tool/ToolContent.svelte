<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { useToolContext } from './context.svelte.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & { class?: string; children?: Snippet };
  let { class: className = '', children, ...rest }: Props = $props();
  const tool = useToolContext('ToolContent');
</script>

{#if tool.open}
  <div {...rest} class={cn('svadmin-ai-tool-content', className)} data-slot="tool-content">
    {@render children?.()}
  </div>
{/if}

<style>
  .svadmin-ai-tool-content { display: grid; gap: 1rem; border-top: 1px solid var(--border, currentColor); padding: 1rem; color: var(--foreground, currentColor); }
</style>
