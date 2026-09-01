<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> & { class?: string; children?: Snippet };
  let { class: className = '', children, ...rest }: Props = $props();
</script>

<header {...rest} class={cn('svadmin-ai-node__header', className)} data-slot="node-header">
  {@render children?.()}
</header>

<style>
  .svadmin-ai-node__header { display: grid; gap: 0.125rem; min-width: 0; padding: 0.75rem; border-bottom: 1px solid var(--border, currentColor); border-radius: min(var(--radius, 0.5rem), 0.5rem) min(var(--radius, 0.5rem), 0.5rem) 0 0; background: var(--secondary, var(--muted, transparent)); }
</style>
