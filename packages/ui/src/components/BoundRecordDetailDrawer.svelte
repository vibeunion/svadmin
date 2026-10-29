<script lang="ts">
  import type { ResourceRendering } from '../rendering/index.js';
  import { definedOptions } from '@svadmin/core/options';
  import type { Snippet } from 'svelte';

  import { useCan, useNavigation, type FieldDefinition } from '@svadmin/core';
  import { useRecordDetail } from './record-detail.svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Copy, Check, Eye, Pencil, RefreshCw } from '@lucide/svelte';
  import DetailDrawer from './DetailDrawer.svelte';
  import FieldDisplay from './FieldDisplay.svelte';
  import { Button } from './ui/button/index.js';
  import { Skeleton } from './ui/skeleton/index.js';

  let {
    resourceName,
    rendering,
    open = $bindable(false),
    recordId,
    onClose,
    extraSections,
  }: {
    resourceName: string;
    rendering?: ResourceRendering | undefined;
    open?: boolean;
    recordId: string | number;
    onClose?: () => void;
    extraSections?: Snippet;
  } = $props();

  const i18n = useTranslation();
  const navigation = useNavigation();
  const detail = useRecordDetail(() => ({ resourceName, id: recordId, rendering }));
  const resource = $derived(detail.resource);
  const showFields = $derived(detail.fields);
  const fieldGroups = $derived.by(() => {
    const groups = new Map<string, FieldDefinition[]>();
    for (const field of showFields) {
      const label = field.group ?? '';
      const fields = groups.get(label) ?? [];
      fields.push(field);
      groups.set(label, fields);
    }
    return [...groups].map(([label, fields]) => ({ label, fields }));
  });
  let copyState = $state<'idle' | 'copied' | 'error'>('idle');
  $effect(() => { void recordId; void resourceName; copyState = 'idle'; });
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

  async function copyId(): Promise<void> {
    if (!canReadRecord || !query.isSuccess) return;
    const id = recordId;
    try {
      await navigator.clipboard.writeText(String(id));
      if (recordId === id) copyState = 'copied';
    } catch {
      if (recordId === id) copyState = 'error';
    }
  }
</script>

{#snippet fieldsList(fields: FieldDefinition[])}
  {#if query.isSuccess}
    {@const record = detail.rendering ? detail.rendering.record(query.data.data) : query.data.data}
    <dl class="divide-y divide-border/60">
      {#each fields as field (field.key)}
        <div class="grid gap-1.5 py-4 sm:grid-cols-[minmax(8rem,1fr)_2fr] sm:gap-6">
          <dt class="text-xs font-medium text-muted-foreground sm:text-sm">{field.label}</dt>
          <dd class="min-w-0 break-words text-sm text-foreground">
            <FieldDisplay type={field.type} value={record[field.key]} options={field.options} resourceName={field.resource} />
          </dd>
        </div>
      {/each}
    </dl>
  {/if}
{/snippet}

<DetailDrawer
  bind:open
  data-svadmin-rendering-resource={detail.rendering?.resource.name}
  data-svadmin-rendering-kind={detail.rendering ? 'detail-drawer' : undefined}
  title="{resource.label} {i18n.t('common.detail')}"
  description={`#${recordId}`}
  closeLabel={i18n.t('common.close')}
  width="w-full sm:max-w-xl"
  {...definedOptions({ onClose })}
  data-svadmin-record-detail
>
  {#snippet extra()}
    {#if canReadRecord && query.isSuccess}
      <Button type="button" variant="ghost" size="icon" onclick={copyId}
        title={i18n.t('common.copyId')} aria-label={i18n.t('common.copyId')}>
        {#if copyState === 'copied'}
          <Check class="h-4 w-4" />
        {:else}
          <Copy class="h-4 w-4" />
        {/if}
      </Button>
      <span role="status">{copyState === 'copied' ? i18n.t('common.copied') : copyState === 'error' ? i18n.t('common.operationFailed') : ''}</span>
    {/if}
  {/snippet}
  {#if permissionPending || (canReadRecord && query.isLoading)}
    <div class="divide-y divide-border/60" role="status" aria-live="polite" aria-label={i18n.t('common.loading')} aria-busy="true">
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
  {:else if query.isError}
    <div role="alert">
      <p>{i18n.t('common.operationFailed')}</p>
      <Button type="button" variant="ghost" size="icon" title={i18n.t('common.retry')}
        aria-label={i18n.t('common.retry')} disabled={query.isFetching} onclick={detail.refresh}>
        <RefreshCw class="h-4 w-4" />
      </Button>
    </div>
  {:else if query.isSuccess}
    {#key `${resourceName}:${recordId}`}
      {#each fieldGroups as group, index (group.label)}
        {#if group.label}
          <details open={index === 0} class="record-detail-group">
            <summary>{group.label}</summary>
            {@render fieldsList(group.fields)}
          </details>
        {:else}
          {@render fieldsList(group.fields)}
        {/if}
      {/each}
    {/key}
  {:else}
    <div class="py-12 text-center">
      <p class="text-sm text-muted-foreground">{i18n.t('common.noData')}</p>
    </div>
  {/if}

  {#if extraSections && canReadRecord && query.isSuccess}
    {#key `${resourceName}:${recordId}`}
      <section data-svadmin-detail-extensions aria-label={i18n.t('common.additionalDetails')}>
        {@render extraSections()}
      </section>
    {/key}
  {/if}

  {#snippet footer()}
    {#if canReadRecord && query.isSuccess}
        <Button type="button" variant="outline" onclick={() => navigateTo('show')}>
          <Eye class="h-4 w-4" data-icon="inline-start" aria-hidden="true" />
          {i18n.t('common.openFullDetail')}
        </Button>
    {/if}
    {#if canReadRecord && query.isSuccess && resource.canEdit !== false && editPermission.allowed === true}
        <Button type="button" onclick={() => navigateTo('edit')}>
          <Pencil class="h-4 w-4" data-icon="inline-start" aria-hidden="true" />
          {i18n.t('common.edit')}
        </Button>
    {/if}
  {/snippet}
</DetailDrawer>

<style>
  .record-detail-group { border-bottom: 1px solid var(--border); }
  .record-detail-group summary { cursor: pointer; padding: 12px 0; font-weight: 500; }
  .record-detail-group summary:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
</style>
