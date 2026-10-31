<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { listText } from './list-i18n.js';

  const i18n = useTranslation();

  interface Props {
    /** Optional table heading. Omit it when the page already owns the heading. */
    title?: string | undefined;
    /** Optional record count rendered beside the heading. */
    count?: number | undefined;
    /** Accessible name for the table region. */
    caption: string;
    /** Keep the last column visible while the table scrolls horizontally. */
    stickyActions?: boolean;
    /** Toolbar content rendered opposite the heading. */
    toolbar?: Snippet | undefined;
    children: Snippet;
    class?: string | undefined;
  }

  let {
    title,
    count,
    caption,
    stickyActions = false,
    toolbar,
    children,
    class: className = '',
  }: Props = $props();
</script>

<section
  class={cn('svadmin-data-table-shell', className)}
  class:svadmin-data-table-shell--sticky-actions={stickyActions}
  aria-label={caption}
  data-svadmin-data-table-shell
>
  {#if title || toolbar}
    <header class="svadmin-data-table-shell__header" data-slot="data-table-shell-header">
      {#if title}
        <div class="svadmin-data-table-shell__heading">
          <h2 class="svadmin-data-table-shell__title">{title}</h2>
          {#if count !== undefined}
            <span class="svadmin-data-table-shell__count" data-svadmin-data-table-count>{listText(i18n, 'common.total', { total: count })}</span>
          {/if}
        </div>
      {/if}
      {#if toolbar}
        <div class="svadmin-data-table-shell__toolbar" data-slot="data-table-shell-toolbar">{@render toolbar()}</div>
      {/if}
    </header>
  {/if}
  <div class="svadmin-data-table-shell__viewport" data-slot="data-table-shell-viewport">
    {@render children()}
  </div>
</section>

<style>
  .svadmin-data-table-shell {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius, 0.5rem);
    background: var(--card, var(--background));
  }
  .svadmin-data-table-shell__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.875rem 1.25rem;
    min-height: 4rem;
    border-bottom: 1px solid var(--border);
    padding: 0.875rem 1.25rem;
    background: var(--card, var(--background));
  }
  .svadmin-data-table-shell__heading {
    display: inline-flex;
    align-items: baseline;
    gap: 0.6rem;
    min-width: 0;
  }
  .svadmin-data-table-shell__title {
    margin: 0;
    color: var(--foreground);
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.35;
  }
  .svadmin-data-table-shell__count {
    color: var(--muted-foreground);
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
  }
  .svadmin-data-table-shell__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.625rem;
  }
  .svadmin-data-table-shell__viewport {
    display: block;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scrollbar-width: thin;
  }
  :global(.svadmin-data-table-shell__viewport [data-slot='table-container']) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: visible;
  }
  :global(.svadmin-data-table-shell__viewport > table > thead > tr > th),
  :global(.svadmin-data-table-shell__viewport > [data-slot='table-container'] > table > thead > tr > th) {
    position: sticky;
    top: 0;
    z-index: 1;
    border-bottom: 1px solid var(--border);
    background: var(--muted);
  }
  :global(.svadmin-data-table-shell--sticky-actions > .svadmin-data-table-shell__viewport > table > :is(thead, tbody, tfoot) > tr > :is(th, td):last-child),
  :global(.svadmin-data-table-shell--sticky-actions > .svadmin-data-table-shell__viewport > [data-slot='table-container'] > table > :is(thead, tbody, tfoot) > tr > :is(th, td):last-child) {
    position: sticky;
    right: 0;
    z-index: 2;
    background: var(--card, var(--background));
    box-shadow: -1px 0 var(--border);
  }
  :global(.svadmin-data-table-shell--sticky-actions > .svadmin-data-table-shell__viewport > table > thead > tr > th:last-child),
  :global(.svadmin-data-table-shell--sticky-actions > .svadmin-data-table-shell__viewport > [data-slot='table-container'] > table > thead > tr > th:last-child) {
    z-index: 3;
    background: var(--muted);
  }
  @media (max-width: 640px) {
    .svadmin-data-table-shell__header { align-items: stretch; }
    .svadmin-data-table-shell__toolbar { width: 100%; }
  }
</style>
