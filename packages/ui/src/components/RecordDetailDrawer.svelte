<script lang="ts">
  import { captureAdminContext, getResource, useCan, useNavigation, useShow } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Eye, Pencil } from '@lucide/svelte';
  import CanAccess from './CanAccess.svelte';
  import DetailDrawer from './DetailDrawer.svelte';
  import { getDisplayComponent } from './fieldComponentMap';
  import { Button } from './ui/button/index.js';
  import { Skeleton } from './ui/skeleton/index.js';

  let {
    resourceName,
    open = $bindable(false),
    recordId,
    onClose,
  } = $props<{
    resourceName: string;
    open?: boolean;
    recordId?: string | number;
    onClose?: () => void;
  }>();

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const navigation = useNavigation();
  const resource = $derived(getResource(resourceName));
  const showFields = $derived(resource.fields.filter((field) => field.showInShow !== false));
  const accessControlEnabled = $derived(!!adminContext.accessControlProvider);
  const showPermission = useCan(() => ({
    resource: resourceName,
    action: 'show',
    params: recordId == null ? undefined : { id: recordId },
    queryOptions: { enabled: open && recordId != null && accessControlEnabled },
  }));
  const permissionPending = $derived(
    accessControlEnabled && open && recordId != null && showPermission.isLoading
  );
  const canReadRecord = $derived(
    resource.canShow !== false && (!accessControlEnabled || (!permissionPending && showPermission.allowed))
  );
  const query = useShow({
    get resource() { return resourceName; },
    get id() { return recordId; },
    get queryOptions() { return { enabled: open && recordId != null && canReadRecord }; },
  });

  function navigateTo(action: 'show' | 'edit'): void {
    if (recordId == null) return;
    navigation[action](resourceName, recordId);
    open = false;
  }
</script>

<DetailDrawer
  bind:open
  title="{resource.label} {i18n.t('common.detail')}"
  description={recordId == null ? undefined : `#${recordId}`}
  closeLabel={i18n.t('common.close')}
  width="w-full sm:max-w-xl"
  {onClose}
  data-svadmin-record-detail
>
  {#if permissionPending || (canReadRecord && query.isLoading)}
    <div class="svadmin-u-fa6acbf81d74 svadmin-u-d2c3932343f5" role="status" aria-live="polite" aria-label={i18n.t('common.loading')} aria-busy="true">
      {#each showFields.slice(0, 6) as field (field.key)}
        <div class="svadmin-u-f3c543ad5fe9 svadmin-u-77a2a20e90d4 svadmin-u-cb11fec3bb46 svadmin-u-d9bdd3d643a2 svadmin-u-022e8076dfea">
          <Skeleton class="svadmin-u-11e59c6d5f6b svadmin-u-69da7e4ff95d" />
          <Skeleton class="svadmin-u-11e59c6d5f6b svadmin-u-6da6a3c3f741 svadmin-u-35b2f3aff60f" />
        </div>
      {/each}
    </div>
  {:else if !canReadRecord}
    <div class="svadmin-u-61357c0c2f29 svadmin-u-ca6bf63030aa" data-svadmin-access-denied>
      <p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('common.accessDenied')}</p>
    </div>
  {:else if query.data?.data}
    {@const record = query.data.data as Record<string, unknown>}
    <dl class="svadmin-u-fa6acbf81d74 svadmin-u-d2c3932343f5">
      {#each showFields as field (field.key)}
        {@const value = record[field.key]}
        {@const DisplayComponent = getDisplayComponent(field.type)}
        <div class="svadmin-u-f3c543ad5fe9 svadmin-u-58284b4ea568 svadmin-u-cb11fec3bb46 svadmin-u-d9bdd3d643a2 svadmin-u-022e8076dfea">
          <dt class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748 svadmin-u-e2327d142859">{field.label}</dt>
          <dd class="svadmin-u-7e0b7cdf1a94 svadmin-u-170cee3ff4e4 svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359">
            {#if DisplayComponent && value != null}
              <DisplayComponent {value} options={field.options} resourceName={field.resource} />
            {:else}
              {value != null ? String(value) : '—'}
            {/if}
          </dd>
        </div>
      {/each}
    </dl>
  {:else}
    <div class="svadmin-u-61357c0c2f29 svadmin-u-ca6bf63030aa">
      <p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('common.noData')}</p>
      {#if query.isError}
        <p class="svadmin-u-50d0d216a2f8 svadmin-u-fc7473ca09eb svadmin-u-811148b13d1e">{(query.error as Error)?.message ?? i18n.t('common.operationFailed')}</p>
      {/if}
    </div>
  {/if}

  {#snippet footer()}
    {#if canReadRecord && recordId != null && resource.canShow !== false}
      <CanAccess resource={resourceName} action="show" params={{ id: recordId }}>
        <Button variant="outline" onclick={() => navigateTo('show')}>
          <Eye class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" aria-hidden="true" />
          {i18n.t('common.openFullDetail')}
        </Button>
      </CanAccess>
    {/if}
    {#if canReadRecord && recordId != null && resource.canEdit !== false}
      <CanAccess resource={resourceName} action="edit" params={{ id: recordId }}>
        <Button onclick={() => navigateTo('edit')}>
          <Pencil class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" aria-hidden="true" />
          {i18n.t('common.edit')}
        </Button>
      </CanAccess>
    {/if}
  {/snippet}
</DetailDrawer>
