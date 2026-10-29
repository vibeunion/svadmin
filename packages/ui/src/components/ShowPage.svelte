<script lang="ts">
  import type { ResourceRendering } from '../rendering/index.js';
  import { captureAdminContext, useNavigation } from '@svadmin/core';
  import { useRecordDetail } from './record-detail.svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { Snippet } from 'svelte';
  import * as Card from './ui/card/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import PageHeader from './PageHeader.svelte';
  import FieldDisplay from './FieldDisplay.svelte';
  import EditButton from './buttons/EditButton.svelte';
  import DeleteButton from './buttons/DeleteButton.svelte';
  import CloneButton from './buttons/CloneButton.svelte';
  import { Button } from './ui/button/index.js';
  import { RefreshCw } from '@lucide/svelte';
import DataState from './content/DataState.svelte';

  const i18n = useTranslation();

  interface Props {
    resourceName: string;
    rendering?: ResourceRendering | undefined;
    id: string | number;
    layout?: 'list' | 'grid';
    columns?: 1 | 2 | 3 | 4;
    bordered?: boolean;
    headerActions?: Snippet;
    children?: Snippet;
    class?: string;
    /** 宿主明确提供来源时优先使用，拒绝外部地址。 */
    returnTo?: string;
    onBack?: () => void;
  }

  let {
    resourceName,
    rendering,
    id,
    layout = 'list',
    columns = 2,
    bordered = false,
    headerActions,
    children,
    class: className = '',
    returnTo,
    onBack,
  }: Props = $props();

  const navigation = useNavigation();
  const context = captureAdminContext();
  function goBack() {
    if (onBack) { onBack(); return; }
    const target = returnTo ?? context.routerProvider?.parse().params['returnTo'];
    if (target?.startsWith('/') && !target.startsWith('//') && !/[\\\r\n]/.test(target)) {
      navigation.push(target);
      return;
    }
    navigation.list(resourceName);
  }

  const detail = useRecordDetail(() => ({ resourceName, id, rendering }));
  const activeRendering = $derived(detail.rendering);
  const resource = $derived(detail.resource);
  const showFields = $derived(detail.fields);
  const query = detail.query;

  const gridColumnClass = $derived.by(() => {
    switch (columns) {
      case 4: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      default: return 'grid-cols-1';
    }
  });
</script>

<div data-svadmin-rendering-resource={activeRendering?.resource.name} data-svadmin-rendering-kind={activeRendering ? 'show' : undefined} data-svadmin-crud-page="show" data-svadmin-resource={resourceName} data-svadmin-record-id={id} class="space-y-4 {className}">
  <div data-svadmin-crud-page-header>
    <PageHeader
      title="{resource.label} {i18n.t('common.detail')} #{id}"
      onBack={goBack}
      backLabel={i18n.t('common.back')}
    >
    {#snippet actions()}
      {#if detail.canRead && query.isSuccess && resource.canEdit !== false}
        <EditButton resource={resourceName} recordItemId={id} hideText />
      {/if}
      {#if detail.canRead && query.isSuccess && resource.canCreate !== false}
        <CloneButton resource={resourceName} recordItemId={id} hideText />
      {/if}
      {#if detail.canRead && query.isSuccess && resource.canDelete !== false}
        <DeleteButton resource={resourceName} recordItemId={id} hideText onSuccess={() => navigation.list(resourceName)} />
      {/if}
      <Button type="button" variant="ghost" size="icon" title={i18n.t('common.refresh')}
        aria-label={i18n.t('common.refresh')} aria-busy={query.isFetching}
        disabled={!detail.canRead || query.isFetching} onclick={detail.refresh}>
        <RefreshCw class="h-4 w-4" />
      </Button>
      {#if headerActions}
        {@render headerActions()}
      {/if}
    {/snippet}
    </PageHeader>
  </div>

  <div data-svadmin-crud-page-content data-svadmin-detail-state={detail.checkingPermission || query.isLoading ? 'loading' : !detail.canRead ? 'forbidden' : query.isError ? 'error' : query.isSuccess ? 'ready' : 'empty'}>
  {#if detail.checkingPermission || query.isLoading}
    <Card.Root class="overflow-hidden border-border/40 shadow-sm">
      <Card.Content class="p-0">
        {#each showFields.slice(0, 6) as _, i (i)}
          <div class="flex flex-col sm:flex-row px-4 sm:px-6 py-3 sm:py-4 {i % 2 === 1 ? 'bg-muted/20' : ''}">
            <Skeleton class="h-4 w-1/2 sm:w-1/4" />
            <Skeleton class="h-4 w-3/4 sm:w-2/5 mt-1 sm:mt-0 sm:ml-auto" />
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {:else if !detail.canRead}
    <div data-svadmin-access-denied>
      <DataState state="forbidden" title={i18n.t('common.accessDenied')} />
    </div>
  {:else if query.isError}
    <DataState state="error" title={i18n.t('common.operationFailed')} retry={detail.refresh} />
  {:else if query.isSuccess}
    {@const record = activeRendering ? activeRendering.record(query.data.data) : query.data.data}
    {#if layout === 'grid'}
      <Card.Root class="overflow-hidden border-border/40 shadow-sm">
        <Card.Content class="p-0">
          <dl class="grid divide-y divide-border/20 sm:divide-y-0 {gridColumnClass}">
            {#each showFields as field, i (i)}
              {@const value = record[field.key]}
              <div class="flex flex-col {bordered ? 'border-b border-r border-border/30 last:border-b-0 p-3 sm:p-4' : 'p-3 sm:p-4 border-b border-border/10'}">
                <dt class="text-xs font-medium text-muted-foreground mb-1">{field.label}</dt>
                <dd class="text-xs sm:text-sm text-foreground font-medium break-words">
                  <FieldDisplay
                    type={field.type}
                    {value}
                    options={field.options}
                    resourceName={field.resource}
                  />
                </dd>
              </div>
            {/each}
          </dl>
        </Card.Content>
      </Card.Root>
    {:else}
      <Card.Root class="overflow-hidden border-border/40 shadow-sm">
        <Card.Content class="p-0 divide-y divide-border/20">
          {#each showFields as field, i (i)}
            {@const value = record[field.key]}
            <div class="flex flex-col sm:flex-row px-4 sm:px-6 py-3 sm:py-3.5 {i % 2 === 1 ? 'bg-muted/10' : ''}">
              <div class="sm:w-1/3 text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-0">{field.label}</div>
              <div class="sm:w-2/3 text-sm text-foreground">
                <FieldDisplay
                  type={field.type}
                  {value}
                  options={field.options}
                  resourceName={field.resource}
                />
              </div>
            </div>
          {/each}
        </Card.Content>
      </Card.Root>
    {/if}
    {#if children}
      <div data-svadmin-crud-page-extension>
        {@render children()}
      </div>
    {/if}
  {:else}
    <DataState state="empty" description={i18n.t('common.noData')} />
  {/if}
  </div>
</div>
