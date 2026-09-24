<script lang="ts">
  import type { Snippet } from 'svelte';
  import { definedOptions } from '@svadmin/core/options';
  import ContentPageShell from './ContentPageShell.svelte';
  import WorkspaceLayout from './WorkspaceLayout.svelte';

  let {
    title, description, actions, metrics, secondary, children,
    pageId = 'dashboard',
  }: {
    title: string;
    description?: string;
    actions?: Snippet;
    metrics?: Snippet;
    secondary?: Snippet;
    children: Snippet;
    pageId?: string;
  } = $props();
</script>

<ContentPageShell {title} {pageId} width="wide" {...definedOptions({ description, actions })}>
  {#if metrics}
    <div class="svadmin-dashboard-metrics" data-svadmin-dashboard-metrics>{@render metrics()}</div>
  {/if}
  <WorkspaceLayout primary={children} {...definedOptions({ secondary })} />
</ContentPageShell>

<style>
  .svadmin-dashboard-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    gap: 1rem;
    min-width: 0;
  }
</style>
