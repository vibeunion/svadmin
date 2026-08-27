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
    <div class="divide-y divide-border/60" aria-label={i18n.t('common.loading')}>
      {#each showFields.slice(0, 6) as field (field.key)}
        <div class="grid gap-2 py-4 sm:grid-cols-[minmax(8rem,1fr)_2fr] sm:gap-6">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-full max-w-64" />
        </div>
      {/each}
    </div>
  {:else if !canReadRecord}
    <div class="py-12 text-center" data-svadmin-access-denied>
      <p class="text-sm text-muted-foreground">{i18n.t('common.accessDenied')}</p>
    </div>
  {:else if query.data?.data}
    {@const record = query.data.data as Record<string, unknown>}
    <dl class="divide-y divide-border/60">
      {#each showFields as field (field.key)}
        {@const value = record[field.key]}
        {@const DisplayComponent = getDisplayComponent(field.type)}
        <div class="grid gap-1.5 py-4 sm:grid-cols-[minmax(8rem,1fr)_2fr] sm:gap-6">
          <dt class="text-xs font-medium text-muted-foreground sm:text-sm">{field.label}</dt>
          <dd class="min-w-0 break-words text-sm text-foreground">
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
    <div class="py-12 text-center">
      <p class="text-sm text-muted-foreground">{i18n.t('common.noData')}</p>
      {#if query.isError}
        <p class="mt-2 text-sm text-destructive">{(query.error as Error)?.message ?? i18n.t('common.operationFailed')}</p>
      {/if}
    </div>
  {/if}

  {#snippet footer()}
    {#if canReadRecord && recordId != null && resource.canShow !== false}
      <CanAccess resource={resourceName} action="show" params={{ id: recordId }}>
        <Button variant="outline" onclick={() => navigateTo('show')}>
          <Eye class="h-4 w-4" data-icon="inline-start" />
          {i18n.t('common.openFullDetail')}
        </Button>
      </CanAccess>
    {/if}
    {#if canReadRecord && recordId != null && resource.canEdit !== false}
      <CanAccess resource={resourceName} action="edit" params={{ id: recordId }}>
        <Button onclick={() => navigateTo('edit')}>
          <Pencil class="h-4 w-4" data-icon="inline-start" />
          {i18n.t('common.edit')}
        </Button>
      </CanAccess>
    {/if}
  {/snippet}
</DetailDrawer>
