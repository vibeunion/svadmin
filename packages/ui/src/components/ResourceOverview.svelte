<script lang="ts">
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import ContentPageShell from './content/ContentPageShell.svelte';
  import DataState from './content/DataState.svelte';
  import ResourceOverviewCard from './ResourceOverviewCard.svelte';

  let { title }: { title?: string } = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
  const resources = $derived(context.resources
    .filter(resource => resource.showInMenu !== false && !resource.parentName)
    .toSorted((left, right) => (left.menuOrder ?? 0) - (right.menuOrder ?? 0)));
</script>

<ContentPageShell title={title ?? i18n.t('common.dashboard')} pageId="resource-overview" width="wide">
  {#if resources.length}
    <div class="svadmin-resource-overview-grid">
      {#each resources as resource (resource.identifier ?? resource.name)}
        <ResourceOverviewCard {resource} />
      {/each}
    </div>
  {:else}
    <DataState state="empty" />
  {/if}
</ContentPageShell>

<style>
  .svadmin-resource-overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    align-items: start;
    gap: 1rem;
    min-width: 0;
  }
</style>
