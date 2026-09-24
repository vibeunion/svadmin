<script lang="ts">
  import { useCan, useNavigation, type ResourceDefinition } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { ArrowRight, Plus } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import DataState from './content/DataState.svelte';

  let { resource }: { resource: ResourceDefinition } = $props();
  const i18n = useTranslation();
  const navigation = useNavigation();
  const read = useCan(() => ({ resource: resource.name, action: 'list' }));
  const create = useCan(() => ({ resource: resource.name, action: 'create' }));
</script>

<section class="svadmin-resource-overview-card" aria-label={resource.label}>
  <h2>{resource.label}</h2>
  {#if read.isLoading}
    <DataState state="loading" />
  {:else if !read.allowed}
    <DataState state="forbidden" />
  {:else}
    <div class="svadmin-resource-overview-actions">
      <Button variant="outline" onclick={() => navigation.list(resource.name)}>
        {i18n.t('profileSections.viewAll')}<ArrowRight aria-hidden="true" />
      </Button>
      {#if resource.canCreate !== false && !create.isLoading && create.allowed}
        <Button onclick={() => navigation.create(resource.name)}>
          <Plus aria-hidden="true" />{i18n.t('common.create')}
        </Button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .svadmin-resource-overview-card {
    display: grid;
    align-content: start;
    gap: 1rem;
    min-width: 0;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
    color: var(--card-foreground);
    box-shadow: var(--shadow-surface);
  }
  h2 { margin: 0; font-size: 1rem; font-weight: 600; overflow-wrap: anywhere; }
  .svadmin-resource-overview-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
</style>
