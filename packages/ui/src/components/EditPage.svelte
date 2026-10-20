<script lang="ts">
  import type { ResourceRendering } from '../rendering/index.js';
  import { definedOptions } from '@svadmin/core/options';

  import { getResource, useNavigation } from '@svadmin/core';
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
    rendering?: ResourceRendering | undefined;
    id: string | number;
    title?: string;
    columns?: 1 | 2 | 3 | 4;
    canDelete?: boolean;
    headerActions?: Snippet;
    formActions?: Snippet<[{ isLoading: boolean; onSubmit: () => void }]>;
    onSuccess?: () => void;
    class?: string;
  }

  let {
    resourceName,
    rendering,
    id,
    title,
    columns = 1,
    canDelete,
    headerActions,
    formActions,
    onSuccess,
    class: className = '',
  }: Props = $props();
  const navigation = useNavigation();
  let navigateGuard = $state<(fn: () => void) => void>((fn) => fn());

  const resource = $derived(getResource(resourceName));
  const pageTitle = $derived(title ?? `${i18n.t('common.edit')} ${resource.label} #${id}`);
  const showDelete = $derived(canDelete ?? resource.canDelete !== false);
</script>

<div class="svadmin-u-b3542e058833 {className}" data-svadmin-crud-page="edit" data-svadmin-resource={resourceName} data-svadmin-record-id={id}>
  <div data-svadmin-crud-page-header>
    <PageHeader
      title={pageTitle}
      onBack={() => navigateGuard(() => navigation.list(resourceName))}
    >
    {#snippet actions()}
      <ListButton resource={resourceName} hideText onBeforeNavigate={navigateGuard} />
      <ShowButton resource={resourceName} recordItemId={id} hideText onBeforeNavigate={navigateGuard} />
      <RefreshButton resource={resourceName} hideText />
      {#if showDelete !== false}
        <DeleteButton resource={resourceName} recordItemId={id} hideText onSuccess={() => navigation.list(resourceName)} />
      {/if}
      {#if headerActions}
        {@render headerActions()}
      {/if}
    {/snippet}
    </PageHeader>
  </div>

  <div data-svadmin-crud-page-form>
    <AutoForm
      {rendering}
      {resourceName}
      mode="edit"
      {id}
      {columns}
      showHeader={false}
      {...definedOptions({ formActions })}
      onNavigationGuardReady={(guard) => navigateGuard = guard}
      {...definedOptions({ "onSuccess": onSuccess })}
    />
  </div>
</div>
