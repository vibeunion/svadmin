<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LiteCapability, LiteFallbackKind } from '../../compatibility';
  import { detectLiteCapabilities, resolveLiteCompatibility } from '../../compatibility';

  interface Props {
    capability: LiteCapability;
    title?: string;
    description?: string;
    fallback?: Snippet;
    children?: Snippet;
    enhanced?: boolean;
  }

  let { capability, title, description, fallback, children, enhanced = false }: Props = $props();
  const resolution = $derived(resolveLiteCompatibility(capability, {
    ...detectLiteCapabilities(null),
    [capability]: enhanced,
  }));
  const kindLabel: Record<LiteFallbackKind, string> = {
    'structured-data': 'Structured view',
    'static-snapshot': 'Static snapshot',
    'server-action': 'Server action',
    'server-refresh': 'Server refresh',
    'server-pagination': 'Server pagination',
    'standard-upload': 'Standard upload',
    'manual-copy': 'Manual copy',
    'server-storage': 'Server storage',
    'in-page-status': 'In-page status',
    download: 'Download',
  };
</script>

<section class="lite-compatibility" data-lite-capability={capability} data-lite-mode={resolution.mode}>
  <div class="lite-compatibility-header">
    <div>
      <h2>{title ?? capability}</h2>
      {#if description}<p>{description}</p>{/if}
    </div>
    <span class="lite-badge lite-badge-info">{kindLabel[resolution.fallbackKind]}</span>
  </div>
  <div class="lite-compatibility-body">
    {#if resolution.mode === 'enhanced' && children}
      {@render children()}
    {:else if fallback}
      {@render fallback()}
    {:else}
      <p>{resolution.fallback}</p>
    {/if}
  </div>
</section>
