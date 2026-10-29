<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    status = 'info',
    title,
    subtitle = '',
    children,
  }: {
    status?: 'success' | 'error' | 'info' | 'warning' | '403' | '404' | '500';
    title: string;
    subtitle?: string;
    children?: Snippet;
  } = $props();
</script>

<section class="svadmin-result" data-status={status}>
  <p class="svadmin-result__status">{status}</p>
  <h2 class="svadmin-result__title">{title}</h2>
  {#if subtitle}<p class="svadmin-result__subtitle">{subtitle}</p>{/if}
  {#if children}<div class="svadmin-result__extra">{@render children()}</div>{/if}
</section>
