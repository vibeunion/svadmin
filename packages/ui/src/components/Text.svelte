<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    type = 'default',
    children,
  }: {
    type?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
    children?: Snippet;
  } = $props();
</script>

<span class="svadmin-text" data-type={type}>{@render children?.()}</span>
