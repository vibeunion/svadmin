<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title = '',
    count = 0,
    onactivate,
    children,
  }: {
    title?: string;
    count?: number;
    onactivate?: () => void;
    children?: Snippet;
  } = $props();
</script>

<section data-testid="custom-card">
  <h2>{title}</h2>
  <output aria-label="Card count">{count}</output>
  <button type="button" onclick={onactivate}>Activate</button>
  {@render children?.()}
</section>
