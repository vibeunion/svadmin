<script lang="ts">
  import type { ResourceRendering } from '../rendering/index.js';
  import { definedOptions } from '@svadmin/core/options';

  import { getResource, captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { Snippet } from 'svelte';
  import PageHeader from './PageHeader.svelte';
  import AutoForm from './AutoForm.svelte';
  import ListButton from './buttons/ListButton.svelte';

  const i18n = useTranslation();

  interface Props {
    resourceName: string;
    rendering?: ResourceRendering | undefined;
    title?: string;
    columns?: 1 | 2 | 3 | 4;
    headerActions?: Snippet;
    formActions?: Snippet<[{ isLoading: boolean; onSubmit: () => void }]>;
    onSuccess?: () => void;
    class?: string;
  }

  let {
    resourceName,
    rendering,
    title,
    columns = 1,
    headerActions,
    formActions,
    onSuccess,
    class: className = '',
  }: Props = $props();
  const adminContext = captureAdminContext();
  let navigateGuard = $state<(fn: () => void) => void>((fn) => fn());

  const resource = $derived(getResource(resourceName));
  const pageTitle = $derived(title ?? `${i18n.t('common.create')}${resource.label}`);
</script>

<div class="space-y-6 {className}" data-svadmin-crud-page="create" data-svadmin-resource={resourceName}>
  <div data-svadmin-crud-page-header>
    <PageHeader
      title={pageTitle}
      onBack={() => navigateGuard(() => adminContext.navigate(`/${resourceName}`))}
    >
    {#snippet actions()}
      <ListButton resource={resourceName} hideText onBeforeNavigate={navigateGuard} />
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
      mode="create"
      {columns}
      showHeader={false}
      {...definedOptions({ formActions })}
      onNavigationGuardReady={(guard) => navigateGuard = guard}
      {...definedOptions({ "onSuccess": onSuccess })}
    />
  </div>
</div>
