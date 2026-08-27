<script lang="ts">
  import { captureAdminContext, getResource } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import type { Snippet } from 'svelte';
  import PageHeader from './PageHeader.svelte';
  import AutoForm from './AutoForm.svelte';
  import ListButton from './buttons/ListButton.svelte';
  import ShowButton from './buttons/ShowButton.svelte';
  import RefreshButton from './buttons/RefreshButton.svelte';
  import DeleteButton from './buttons/DeleteButton.svelte';

  const i18n = useTranslation();

  interface Props {
    resourceName: string;
    id: string | number;
    title?: string;
    density?: 'compact' | 'comfortable';
    columns?: 1 | 2 | 3 | 4;
    canDelete?: boolean;
    headerActions?: Snippet;
    onSuccess?: () => void;
    class?: string;
  }

  let {
    resourceName,
    id,
    title,
    density = 'comfortable',
    columns = 1,
    canDelete,
    headerActions,
    onSuccess,
    class: className = '',
  }: Props = $props();
  const adminContext = captureAdminContext();
  let navigateGuard = $state<(fn: () => void) => void>((fn) => fn());

  const resource = $derived(getResource(resourceName));
  const pageTitle = $derived(title ?? `${i18n.t('common.edit')} ${resource.label} #${id}`);
  const showDelete = $derived(canDelete ?? resource.canDelete !== false);
</script>

<div class="{density === 'compact' ? 'space-y-4' : 'space-y-6'} {className}">
  <PageHeader
    title={pageTitle}
    {density}
    onBack={() => navigateGuard(() => adminContext.navigate(`/${resourceName}`))}
  >
    {#snippet actions()}
      <ListButton resource={resourceName} hideText onBeforeNavigate={navigateGuard} />
      <ShowButton resource={resourceName} recordItemId={id} hideText onBeforeNavigate={navigateGuard} />
      <RefreshButton resource={resourceName} hideText />
      {#if showDelete !== false}
        <DeleteButton resource={resourceName} recordItemId={id} hideText onSuccess={() => adminContext.navigate(`/${resourceName}`)} />
      {/if}
      {#if headerActions}
        {@render headerActions()}
      {/if}
    {/snippet}
  </PageHeader>

  <AutoForm
    {resourceName}
    mode="edit"
    {id}
    {density}
    {columns}
    showHeader={false}
    onNavigationGuardReady={(guard) => navigateGuard = guard}
    {onSuccess}
  />
</div>
