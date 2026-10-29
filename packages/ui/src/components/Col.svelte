<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    span?: number;
    offset?: number;
    order?: number;
    class?: string;
    children?: Snippet;
  }

  let { span = 24, offset = 0, order, class: className = '', children }: Props = $props();
  const safeSpan = $derived(Math.max(1, Math.min(24, span)));
  const safeOffset = $derived(Math.max(0, Math.min(23, offset)));
  const column = $derived(safeOffset > 0 ? `${safeOffset + 1} / span ${safeSpan}` : `span ${safeSpan}`);
</script>

<div class={cn('svadmin-col', className)} style:grid-column={column} style:order={order ?? null}>
  {@render children?.()}
</div>

<style>
  .svadmin-col {
    min-width: 0;
  }
</style>