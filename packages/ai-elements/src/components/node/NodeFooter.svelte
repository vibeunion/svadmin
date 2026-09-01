<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> & { class?: string; children?: Snippet };
  let { class: className = '', children, ...rest }: Props = $props();
</script>

<footer {...rest} class={cn('svadmin-ai-node__footer', className)} data-slot="node-footer">
  {@render children?.()}
</footer>

<style>
  .svadmin-ai-node__footer { display: flex; min-width: 0; align-items: center; gap: 0.5rem; padding: 0.75rem; border-top: 1px solid var(--border, currentColor); border-radius: 0 0 min(var(--radius, 0.5rem), 0.5rem) min(var(--radius, 0.5rem), 0.5rem); background: var(--secondary, var(--muted, transparent)); }
</style>
