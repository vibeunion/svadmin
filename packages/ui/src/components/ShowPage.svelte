<script lang="ts">
  import { captureAdminContext, useShow, getResource } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { Snippet } from 'svelte';
  import * as Card from './ui/card/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import PageHeader from './PageHeader.svelte';
  import { getDisplayComponent } from './fieldComponentMap.js';
  import ListButton from './buttons/ListButton.svelte';
  import EditButton from './buttons/EditButton.svelte';
  import DeleteButton from './buttons/DeleteButton.svelte';
  import CloneButton from './buttons/CloneButton.svelte';
  import RefreshButton from './buttons/RefreshButton.svelte';

  const i18n = useTranslation();

  interface Props {
    resourceName: string;
    id: string | number;
    density?: 'compact' | 'comfortable';
    layout?: 'list' | 'grid';
    columns?: 1 | 2 | 3 | 4;
    bordered?: boolean;
    headerActions?: Snippet;
    children?: Snippet;
    class?: string;
  }

  let {
    resourceName,
    id,
    density = 'comfortable',
    layout = 'list',
    columns = 2,
    bordered = false,
    headerActions,
    children,
    class: className = '',
  }: Props = $props();

  const adminContext = captureAdminContext();
  const isCompact = $derived(density === 'compact');

  const resource = $derived(getResource(resourceName));
  const showFields = $derived(resource.fields.filter(f => f.showInShow !== false));

  const query = useShow({ get resource() { return resourceName; }, get id() { return id; } });

  const gridColumnClass = $derived.by(() => {
    switch (columns) {
      case 4: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      default: return 'grid-cols-1';
    }
  });
</script>

<div class="{isCompact ? 'space-y-3' : 'space-y-4'} {className}">
  <PageHeader
    title="{resource.label} {i18n.t('common.detail')} #{id}"
    {density}
    onBack={() => adminContext.navigate(`/${resourceName}`)}
  >
    {#snippet actions()}
      <ListButton resource={resourceName} hideText />
      {#if resource.canEdit !== false}
        <EditButton resource={resourceName} recordItemId={id} hideText />
      {/if}
      {#if resource.canCreate !== false}
        <CloneButton resource={resourceName} recordItemId={id} hideText />
      {/if}
      {#if resource.canDelete !== false}
        <DeleteButton resource={resourceName} recordItemId={id} hideText onSuccess={() => adminContext.navigate(`/${resourceName}`)} />
      {/if}
      <RefreshButton resource={resourceName} hideText />
      {#if headerActions}
        {@render headerActions()}
      {/if}
    {/snippet}
  </PageHeader>

  {#if query.isLoading}
    <Card.Root class="overflow-hidden border-border/40 shadow-sm">
      <Card.Content class="p-0">
        {#each showFields.slice(0, 6) as _, i (i)}
          <div class="flex flex-col sm:flex-row {isCompact ? 'px-4 py-2' : 'px-4 sm:px-6 py-3 sm:py-4'} {i % 2 === 1 ? 'bg-muted/20' : ''}">
            <Skeleton class="h-4 w-1/2 sm:w-1/4" />
            <Skeleton class="h-4 w-3/4 sm:w-2/5 mt-1 sm:mt-0 sm:ml-auto" />
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {:else if query.data?.data}
    {#if layout === 'grid'}
      <Card.Root class="overflow-hidden border-border/40 shadow-sm">
        <Card.Content class="p-0">
          <dl class="grid divide-y divide-border/20 sm:divide-y-0 {gridColumnClass}">
            {#each showFields as field, i (i)}
              {@const value = ((query.data as { data: Record<string, unknown> }).data as Record<string, unknown>)[field.key]}
              {@const DisplayComponent = getDisplayComponent(field.type)}
              <div class="flex flex-col {bordered ? 'border-b border-r border-border/30 last:border-b-0 p-3 sm:p-4' : 'p-3 sm:p-4 border-b border-border/10'}">
                <dt class="text-xs font-medium text-muted-foreground mb-1">{field.label}</dt>
                <dd class="text-xs sm:text-sm text-foreground font-medium break-words">
                  {#if DisplayComponent && value != null}
                    <DisplayComponent
                      {value}
                      options={field.options}
                      resourceName={field.resource}
                    />
                  {:else}
                    {value != null ? String(value) : '—'}
                  {/if}
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
            {@const value = ((query.data as { data: Record<string, unknown> }).data as Record<string, unknown>)[field.key]}
            {@const DisplayComponent = getDisplayComponent(field.type)}
            <div class="flex flex-col sm:flex-row {isCompact ? 'px-4 py-2 sm:px-5 sm:py-2' : 'px-4 sm:px-6 py-3 sm:py-3.5'} {i % 2 === 1 ? 'bg-muted/10' : ''}">
              <div class="sm:w-1/3 {isCompact ? 'text-xs' : 'text-xs sm:text-sm'} font-medium text-muted-foreground mb-1 sm:mb-0">{field.label}</div>
              <div class="sm:w-2/3 {isCompact ? 'text-xs sm:text-sm' : 'text-sm'} text-foreground">
                {#if DisplayComponent && value != null}
                  <DisplayComponent
                    {value}
                    options={field.options}
                    resourceName={field.resource}
                  />
                {:else}
                  {value != null ? String(value) : '—'}
                {/if}
              </div>
            </div>
          {/each}
        </Card.Content>
      </Card.Root>
    {/if}
    {#if children}
      {@render children()}
    {/if}
  {:else}
    <Card.Root class="overflow-hidden border-border/40 shadow-sm">
      <Card.Content class="p-8 text-center">
        <p class="text-muted-foreground">{i18n.t('common.noData')}</p>
        {#if query.isError}
          <p class="text-sm text-destructive mt-2">{(query.error as Error)?.message ?? i18n.t('common.operationFailed')}</p>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}
</div>
