<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    title = 'Data Dashboard',
    class: className = '',
    children,
  }: Props = $props();
</script>

<div
  class="lite-datascreen-container {className}"
  data-svadmin-component="LiteDataScreenContainer"
>
  <header class="lite-datascreen-header">
    <h2 class="lite-datascreen-title">{title}</h2>
  </header>
  <main class="lite-datascreen-body">
    {#if children}{@render children()}{/if}
  </main>
</div>

<style>
  .lite-datascreen-container { background: #0f172a; color: #f8fafc; border-radius: 8px; padding: 24px; min-height: 480px; }
  .lite-datascreen-header { border-bottom: 1px solid #334155; padding-bottom: 14px; margin-bottom: 20px; }
  .lite-datascreen-title { font-size: 18px; font-weight: 700; color: #f8fafc; margin: 0; }
  .lite-datascreen-body { width: 100%; }
</style>
