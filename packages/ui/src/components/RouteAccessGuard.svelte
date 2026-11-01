<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import { captureAdminContext, useCan, type Action } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { Snippet } from 'svelte';
  import DataState from './content/DataState.svelte';

  interface Props {
    resource: string;
    action?: Action;
    id?: string | number;
    children: Snippet;
  }

  let {
    resource,
    action = 'list',
    id,
    children,
  }: Props = $props();

  const adminContext = captureAdminContext();
  const i18n = useTranslation();
  const accessControlEnabled = $derived(Boolean(adminContext.accessControlProvider));
  const permission = useCan(() => (definedOptions({
    resource,
    action,
    id,
    queryOptions: { enabled: accessControlEnabled },
  })));
  const denialDescription = $derived(
    permission.isError ? i18n.t('common.permissionUnavailable') : i18n.t('common.permissionDenied'),
  );
</script>

{#if accessControlEnabled && permission.isLoading}
  <DataState state="loading" />
{:else if !accessControlEnabled || permission.allowed}
  {@render children()}
{:else}
  <DataState state={permission.isError ? 'error' : 'forbidden'} description={denialDescription} />
{/if}
