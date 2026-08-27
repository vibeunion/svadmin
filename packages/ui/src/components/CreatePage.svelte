<script lang="ts">
  import { getResource, captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { Snippet } from 'svelte';
  import PageHeader from './PageHeader.svelte';
  import AutoForm from './AutoForm.svelte';
  import ListButton from './buttons/ListButton.svelte';

  const i18n = useTranslation();

  interface Props {
    resourceName: string;
    title?: string;
    density?: 'compact' | 'comfortable';
    columns?: 1 | 2 | 3 | 4;
    headerActions?: Snippet;
    onSuccess?: () => void;
    class?: string;
  }

  let {
    resourceName,
    title,
    density = 'comfortable',
    columns = 1,
    headerActions,
    onSuccess,
    class: className = '',
  }: Props = $props();
  const adminContext = captureAdminContext();

  const resource = $derived(getResource(resourceName));
  const pageTitle = $derived(title ?? `${i18n.t('common.create')}${resource.label}`);
</script>

<div class="{density === 'compact' ? 'space-y-4' : 'space-y-6'} {className}">
  <PageHeader
    title={pageTitle}
    {density}
    onBack={() => adminContext.navigate(`/${resourceName}`)}
  >
    {#snippet actions()}
      <ListButton resource={resourceName} hideText />
      {#if headerActions}
        {@render headerActions()}
      {/if}
    {/snippet}
  </PageHeader>

  <AutoForm
    {resourceName}
    mode="create"
    {density}
    {columns}
    showHeader={false}
    {onSuccess}
  />
</div>
