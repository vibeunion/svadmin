<script lang="ts">
  import { useNavigation, useShow, getResource } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { Snippet } from 'svelte';
  import * as Card from './ui/card/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import PageHeader from './PageHeader.svelte';
  import { getDisplayComponent } from './fieldComponentMap.js';
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

  const navigation = useNavigation();
  const isCompact = $derived(density === 'compact');

  const resource = $derived(getResource(resourceName));
  const showFields = $derived(resource.fields.filter(f => f.showInShow !== false));

  const query = useShow({ get resource() { return resourceName; }, get id() { return id; } });

  const gridColumnClass = $derived.by(() => {
    switch (columns) {
      case 4: return 'svadmin-u-d7c8339810d3 svadmin-u-e00ad81645a2 svadmin-u-9a638cfe8212 svadmin-u-4558bce6d8c0';
      case 3: return 'svadmin-u-d7c8339810d3 svadmin-u-e00ad81645a2 svadmin-u-19d9b25e8fae';
      case 2: return 'svadmin-u-d7c8339810d3 svadmin-u-e00ad81645a2';
      default: return 'grid-cols-1';
    }
  });
</script>

<div class="{isCompact ? 'svadmin-u-6ed543e2fbbb' : 'svadmin-u-3e7ce58d64fa'} {className}">
  <PageHeader
    title="{resource.label} {i18n.t('common.detail')} #{id}"
    {density}
    onBack={() => navigation.list(resourceName)}
    backLabel={i18n.t('common.backToList')}
  >
    {#snippet actions()}
      {#if resource.canEdit !== false}
        <EditButton resource={resourceName} recordItemId={id} hideText />
      {/if}
      {#if resource.canCreate !== false}
        <CloneButton resource={resourceName} recordItemId={id} hideText />
      {/if}
      {#if resource.canDelete !== false}
        <DeleteButton resource={resourceName} recordItemId={id} hideText onSuccess={() => navigation.list(resourceName)} />
      {/if}
      <RefreshButton resource={resourceName} hideText />
      {#if headerActions}
        {@render headerActions()}
      {/if}
    {/snippet}
  </PageHeader>

  {#if query.isLoading}
    <Card.Root class="svadmin-u-2cd02d11d1af svadmin-u-6ee2d41e2d2d svadmin-u-438b2237b8d6">
      <Card.Content class="svadmin-u-8a539c7fe216">
        {#each showFields.slice(0, 6) as _, i (i)}
          <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-020ba687fa12 {isCompact ? 'svadmin-u-f0faeb26d656 svadmin-u-03b4dd7f172b' : 'svadmin-u-f0faeb26d656 svadmin-u-7a9aabfcd059 svadmin-u-1b2d54a3fd12 svadmin-u-b7daff9b9ddd'} {i % 2 === 1 ? 'svadmin-u-967d113a1451' : ''}">
            <Skeleton class="svadmin-u-11e59c6d5f6b svadmin-u-b7ce0d2f6c04 svadmin-u-5a14cc9f9ed4" />
            <Skeleton class="svadmin-u-11e59c6d5f6b svadmin-u-1d9f2d98d149 svadmin-u-d2ffb24f3e1d svadmin-u-b6b02c0ebef6 svadmin-u-dfe9bd9e7001 svadmin-u-77533d414653" />
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {:else if query.data?.data}
    {#if layout === 'grid'}
      <Card.Root class="svadmin-u-2cd02d11d1af svadmin-u-6ee2d41e2d2d svadmin-u-438b2237b8d6">
        <Card.Content class="svadmin-u-8a539c7fe216">
          <dl class="svadmin-u-f3c543ad5fe9 svadmin-u-fa6acbf81d74 svadmin-u-3533cbce9e93 svadmin-u-4d9da416df16 {gridColumnClass}">
            {#each showFields as field, i (i)}
              {@const value = ((query.data as { data: Record<string, unknown> }).data as Record<string, unknown>)[field.key]}
              {@const DisplayComponent = getDisplayComponent(field.type)}
              <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed {bordered ? 'svadmin-u-65fdbade2025 svadmin-u-5ceb636bd9f3 svadmin-u-cdf6e054e5e0 svadmin-u-b4cf72cd1cd8 svadmin-u-eb6e8b881acd svadmin-u-1884518576f2' : 'svadmin-u-eb6e8b881acd svadmin-u-1884518576f2 svadmin-u-65fdbade2025 svadmin-u-945ecb9a9005'}">
                <dt class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748 svadmin-u-65281709dacf">{field.label}</dt>
                <dd class="svadmin-u-359090c2d529 svadmin-u-e2327d142859 svadmin-u-d4108abe6359 svadmin-u-2689f3958069 svadmin-u-170cee3ff4e4">
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
      <Card.Root class="svadmin-u-2cd02d11d1af svadmin-u-6ee2d41e2d2d svadmin-u-438b2237b8d6">
        <Card.Content class="svadmin-u-8a539c7fe216 svadmin-u-fa6acbf81d74 svadmin-u-3533cbce9e93">
          {#each showFields as field, i (i)}
            {@const value = ((query.data as { data: Record<string, unknown> }).data as Record<string, unknown>)[field.key]}
            {@const DisplayComponent = getDisplayComponent(field.type)}
            <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-020ba687fa12 {isCompact ? 'svadmin-u-f0faeb26d656 svadmin-u-03b4dd7f172b svadmin-u-cc06a6575385 svadmin-u-7209fd2a90e7' : 'svadmin-u-f0faeb26d656 svadmin-u-7a9aabfcd059 svadmin-u-1b2d54a3fd12 svadmin-u-4701b613ff95'} {i % 2 === 1 ? 'svadmin-u-8a25a995eb8e' : ''}">
              <div class="svadmin-u-b03f3c253900 {isCompact ? 'svadmin-u-359090c2d529' : 'svadmin-u-359090c2d529 svadmin-u-e2327d142859'} svadmin-u-2689f3958069 svadmin-u-bfa603190748 svadmin-u-65281709dacf svadmin-u-84bdd56b0e81">{field.label}</div>
              <div class="svadmin-u-6b3526212209 {isCompact ? 'svadmin-u-359090c2d529 svadmin-u-e2327d142859' : 'svadmin-u-fc7473ca09eb'} svadmin-u-d4108abe6359">
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
    <Card.Root class="svadmin-u-2cd02d11d1af svadmin-u-6ee2d41e2d2d svadmin-u-438b2237b8d6">
      <Card.Content class="svadmin-u-845f53365c8d svadmin-u-ca6bf63030aa">
        <p class="svadmin-u-bfa603190748">{i18n.t('common.noData')}</p>
        {#if query.isError}
          <p class="svadmin-u-fc7473ca09eb svadmin-u-811148b13d1e svadmin-u-50d0d216a2f8">{(query.error as Error)?.message ?? i18n.t('common.operationFailed')}</p>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}
</div>
