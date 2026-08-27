<script lang="ts">
  import type { Action } from '@svadmin/core';
  import { captureAdminContext, useCan } from '@svadmin/core';
  import type { Snippet } from 'svelte';
  import DataState from './content/DataState.svelte';

  interface Props {
    resourceName: string;
    action: Action;
    id?: string | number;
    requireSourceRead?: boolean;
    children: Snippet;
  }

  let {
    resourceName,
    action,
    id,
    requireSourceRead = false,
    children,
  }: Props = $props();

  const adminContext = captureAdminContext();
  const resource = $derived(adminContext.getResource(resourceName));
  const accessControlEnabled = $derived(Boolean(adminContext.accessControlProvider));
  const actionAllowedByResource = $derived(
    action === 'create'
      ? resource.canCreate !== false
      : action === 'edit'
        ? resource.canEdit !== false
        : action === 'show'
          ? resource.canShow !== false
          : true,
  );
  const sourceReadAllowedByResource = $derived(!requireSourceRead || resource.canShow !== false);
  const params = $derived(id === undefined ? undefined : { id });
  const permission = useCan(() => ({
    resource: resourceName,
    action,
    params,
    queryOptions: { enabled: accessControlEnabled },
  }));
  const sourceReadPermission = useCan(() => ({
    resource: resourceName,
    action: 'show',
    params,
    queryOptions: { enabled: accessControlEnabled && requireSourceRead },
  }));
  const permissionPending = $derived(
    accessControlEnabled
      && (permission.isLoading || (requireSourceRead && sourceReadPermission.isLoading)),
  );
  const allowed = $derived(
    actionAllowedByResource
      && sourceReadAllowedByResource
      && (!accessControlEnabled || permission.allowed)
      && (!requireSourceRead || !accessControlEnabled || sourceReadPermission.allowed),
  );
  const denialReason = $derived(permission.reason ?? sourceReadPermission.reason);
</script>

{#if permissionPending}
  <DataState state="loading" />
{:else if allowed}
  {@render children()}
{:else}
  <DataState state="forbidden" description={denialReason} />
{/if}
