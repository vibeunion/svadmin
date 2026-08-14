<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    children?: Snippet;
  }

  let { title = '', children }: Props = $props();
</script>

<header class="lite-header" style="padding: 16px 24px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
  <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #0f172a;">{title}</h2>
  <div class="lite-inline-lg" style="align-items: center;">
    {#if children}
      {@render children()}
    {/if}
  </div>
</header>
