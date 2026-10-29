<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    tip = '',
    children,
  }: {
    tip?: string;
    children?: Snippet;
  } = $props();
</script>

<div class="svadmin-spin" role="status">
  <span class="svadmin-spin__icon" aria-hidden="true"></span>
  {#if tip}<span class="svadmin-spin__tip">{tip}</span>{/if}
  {#if children}<span class="svadmin-sr-only">{@render children()}</span>{/if}
</div>
