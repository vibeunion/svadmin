<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'class' | 'children'> & { class?: string; children?: Snippet };
  let { class: className = '', children, ...rest }: Props = $props();
</script>

<span {...rest} class={cn('svadmin-ai-snippet-text', className)} data-slot="snippet-text">
  {@render children?.()}
</span>

<style>
  .svadmin-ai-snippet-text { padding-inline-start: 0.5rem; color: var(--muted-foreground, currentColor); font-family: inherit; font-size: 0.875rem; font-weight: 400; }
</style>
