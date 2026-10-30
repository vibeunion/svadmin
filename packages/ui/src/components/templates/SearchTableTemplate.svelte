<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    filters?: Snippet;
    bulkActions?: Snippet;
    metrics?: Snippet;
    table: Snippet;
    pagination?: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let {
    title,
    description,
    actions,
    filters,
    bulkActions,
    metrics,
    table,
    pagination,
    footer,
    pageId = 'search-table',
    width = 'wide',
  }: Props = $props();

  const hasToolbar = $derived(Boolean(filters || bulkActions));
  const hasFooter = $derived(Boolean(pagination || footer));
</script>

{#snippet toolbar()}
  <div class="svadmin-search-table-template__toolbar">
    {#if filters}{@render filters()}{/if}
    {#if bulkActions}<div class="svadmin-search-table-template__bulk">{@render bulkActions()}</div>{/if}
  </div>
{/snippet}

{#snippet footerContent()}
  <div class="svadmin-search-table-template__footer">
    {#if pagination}{@render pagination()}{/if}
    {#if footer}{@render footer()}{/if}
  </div>
{/snippet}

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {...(hasToolbar ? { toolbar } : {})}
  {...(metrics ? { metrics } : {})}
  primary={table}
  {...(hasFooter ? { footer: footerContent } : {})}
  {pageId}
  {width}
  primaryLabel="Search results"
/>

<style>
  .svadmin-search-table-template__toolbar { display: flex; flex: 1; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--svadmin-space-3); min-width: 0; }
  .svadmin-search-table-template__bulk { display: flex; flex-wrap: wrap; gap: var(--svadmin-space-2); }
  .svadmin-search-table-template__footer { display: flex; flex: 1; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--svadmin-space-3); min-width: 0; }
</style>
