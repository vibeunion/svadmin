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
    density?: 'compact' | 'comfortable';
    columns?: 1 | 2 | 3 | 4;
    headerActions?: Snippet;
    onSuccess?: () => void;
    class?: string;
  }

  let {
    resourceName,
    rendering,
    title,
    density = 'comfortable',
    columns = 1,
    headerActions,
    onSuccess,
    class: className = '',
  }: Props = $props();
  const adminContext = captureAdminContext();
  let navigateGuard = $state<(fn: () => void) => void>((fn) => fn());

  const resource = $derived(getResource(resourceName));
  const pageTitle = $derived(title ?? `${i18n.t('common.create')}${resource.label}`);
</script>

<div class="{density === 'compact' ? 'svadmin-u-3e7ce58d64fa' : 'svadmin-u-b3542e058833'} {className}">
  <PageHeader
    title={pageTitle}
    {density}
    onBack={() => navigateGuard(() => adminContext.navigate(`/${resourceName}`))}
  >
    {#snippet actions()}
      <ListButton resource={resourceName} hideText onBeforeNavigate={navigateGuard} />
      {#if headerActions}
        {@render headerActions()}
      {/if}
    {/snippet}
  </PageHeader>

  <AutoForm
    {rendering}
    {resourceName}
    mode="create"
    {density}
    {columns}
    showHeader={false}
    onNavigationGuardReady={(guard) => navigateGuard = guard}
    {...definedOptions({ "onSuccess": onSuccess })}
  />
</div>
