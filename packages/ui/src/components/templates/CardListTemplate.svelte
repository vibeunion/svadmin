<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    tabs?: Snippet;
    filters?: Snippet;
    addCard?: Snippet;
    items: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, description, actions, tabs, filters, addCard, items, footer, pageId = 'card-list', width = 'wide' }: Props = $props();
  const hasToolbar = $derived(Boolean(tabs || filters));
</script>

{#snippet toolbar()}
  <div class="svadmin-card-list-template__toolbar">
    {#if tabs}{@render tabs()}{/if}
    {#if filters}{@render filters()}{/if}
  </div>
{/snippet}

{#snippet content()}
  <div class="svadmin-card-list-template__content">
    {#if addCard}{@render addCard()}{/if}
    {@render items()}
  </div>
{/snippet}

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  {...(hasToolbar ? { toolbar } : {})}
  primary={content}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="Cards"
/>

<style>
  .svadmin-card-list-template__toolbar { display: flex; flex: 1; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--svadmin-space-3); min-width: 0; }
  .svadmin-card-list-template__content { display: grid; gap: var(--svadmin-space-4); min-width: 0; }
</style>
