<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    span?: number;
    rowSpan?: number;
    class?: string;
    children?: Snippet;
  }

  let { span = 1, rowSpan = 1, class: className = '', children }: Props = $props();
</script>

<div
  class={cn('svadmin-grid-item', className)}
  style:grid-column={`span ${Math.max(1, span)}`}
  style:grid-row={`span ${Math.max(1, rowSpan)}`}
>
  {@render children?.()}
</div>

<style>
  .svadmin-grid-item {
    min-width: 0;
  }
</style>