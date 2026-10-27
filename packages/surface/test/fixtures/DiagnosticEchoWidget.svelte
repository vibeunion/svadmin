<script lang="ts">
  import type { SurfaceWidgetRendererProps } from '../../src/catalog.js';
  let { data }: SurfaceWidgetRendererProps = $props();
</script>

{#if data.status === 'error'}
  <p role="alert" data-testid="diagnostic-message">{data.error.message}</p>
{:else}
  <p data-testid="diagnostic-message">{data.status}</p>
{/if}
