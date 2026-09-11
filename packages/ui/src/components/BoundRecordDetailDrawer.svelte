<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import { useCan, useNavigation } from '@svadmin/core';
  import { useRecordDetail } from './record-detail.svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Eye, Pencil, RefreshCw } from '@lucide/svelte';
  import DetailDrawer from './DetailDrawer.svelte';
  import FieldDisplay from './FieldDisplay.svelte';
  import { Button } from './ui/button/index.js';
  import { Skeleton } from './ui/skeleton/index.js';

  let {
    resourceName,
    open = $bindable(false),
    recordId,
    onClose,
  }: {
    resourceName: string;
    open?: boolean;
    recordId: string | number;
    onClose?: () => void;
  } = $props();

  const i18n = useTranslation();
  const navigation = useNavigation();
  const detail = useRecordDetail(() => ({ resourceName, id: recordId }));
  const resource = $derived(detail.resource);
  const showFields = $derived(detail.fields);
  const permissionPending = $derived(detail.checkingPermission);
  const canReadRecord = $derived(detail.canRead);
  const query = detail.query;
  const editPermission = useCan(() => ({
    resource: resourceName, action: 'edit', id: recordId,
    queryOptions: { enabled: canReadRecord && resource.canEdit !== false },
  }));

  function navigateTo(action: 'show' | 'edit'): void {
    if (!canReadRecord || !query.isSuccess || (action === 'edit' &&
      (resource.canEdit === false || editPermission.allowed !== true))) return;
    navigation[action](resourceName, recordId);
    open = false;
  }
</script>

<DetailDrawer
  bind:open
  title="{resource.label} {i18n.t('common.detail')}"
  description={`#${recordId}`}
  closeLabel={i18n.t('common.close')}
  width="w-full sm:max-w-xl"
  {...definedOptions({ onClose })}
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
  {:else if query.isError}
    <div role="alert">
      <p>{i18n.t('common.operationFailed')}</p>
      <Button type="button" variant="ghost" size="icon" title={i18n.t('common.retry')}
        aria-label={i18n.t('common.retry')} disabled={query.isFetching} onclick={detail.refresh}>
        <RefreshCw class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
      </Button>
    </div>
  {:else if query.isSuccess}
    {@const record = query.data.data}
    <dl class="svadmin-u-fa6acbf81d74 svadmin-u-d2c3932343f5">
      {#each showFields as field (field.key)}
        {@const value = record[field.key]}
        <div class="svadmin-u-f3c543ad5fe9 svadmin-u-58284b4ea568 svadmin-u-cb11fec3bb46 svadmin-u-d9bdd3d643a2 svadmin-u-022e8076dfea">
          <dt class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748 svadmin-u-e2327d142859">{field.label}</dt>
          <dd class="svadmin-u-7e0b7cdf1a94 svadmin-u-170cee3ff4e4 svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359">
            <FieldDisplay type={field.type} {value} options={field.options} resourceName={field.resource} />
          </dd>
        </div>
      {/each}
    </dl>
  {:else}
    <div class="svadmin-u-61357c0c2f29 svadmin-u-ca6bf63030aa">
      <p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('common.noData')}</p>
    </div>
  {/if}

  {#snippet footer()}
    {#if canReadRecord && query.isSuccess}
        <Button type="button" variant="outline" onclick={() => navigateTo('show')}>
          <Eye class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" aria-hidden="true" />
          {i18n.t('common.openFullDetail')}
        </Button>
    {/if}
    {#if canReadRecord && query.isSuccess && resource.canEdit !== false && editPermission.allowed === true}
        <Button type="button" onclick={() => navigateTo('edit')}>
          <Pencil class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" aria-hidden="true" />
          {i18n.t('common.edit')}
        </Button>
    {/if}
  {/snippet}
</DetailDrawer>
