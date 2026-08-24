<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    leading?: Snippet;
    trailing?: Snippet;
    children?: Snippet;
    class?: string;
  }
  let { leading, trailing, children, class: className = '' }: Props = $props();
</script>

<div data-svadmin-table-toolbar class={'flex flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between ' + className}>
  <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
    {#if leading}{@render leading()}{/if}
    {#if children}{@render children()}{/if}
  </div>
  {#if trailing}<div class="flex shrink-0 flex-wrap items-center gap-2">{@render trailing()}</div>{/if}
</div>
