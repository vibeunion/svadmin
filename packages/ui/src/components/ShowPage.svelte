<script lang="ts">
  import { captureAdminContext, useShow, getResource } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { Snippet } from 'svelte';
  import * as Card from './ui/card/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import PageHeader from './PageHeader.svelte';
  import { getDisplayComponent } from './fieldComponentMap';
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
    headerActions?: Snippet;
    children?: Snippet;
    class?: string;
  }

  let {
    resourceName,
    id,
    density = 'comfortable',
    headerActions,
    children,
    class: className = '',
  }: Props = $props();

  const adminContext = captureAdminContext();
  const isCompact = $derived(density === 'compact');

  const resource = $derived(getResource(resourceName));
  const showFields = $derived(resource.fields.filter(f => f.showInShow !== false));

  const query = useShow({ get resource() { return resourceName; }, get id() { return id; } });
</script>

<div class="{isCompact ? 'space-y-4' : 'space-y-6'} {className}">
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
    <Card.Root class="overflow-hidden border-border/40 shadow-sm">
      <Card.Content class="p-0 divide-y divide-border/20">
        {#each showFields as field, i (i)}
          {@const value = ((query.data as { data: Record<string, unknown> }).data as Record<string, unknown>)[field.key]}
          {@const DisplayComponent = getDisplayComponent(field.type)}
          <div class="flex flex-col sm:flex-row {isCompact ? 'px-4 py-2.5 sm:px-5 sm:py-2.5' : 'px-4 sm:px-6 py-3 sm:py-4'} {i % 2 === 1 ? 'bg-muted/10' : ''}">
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
