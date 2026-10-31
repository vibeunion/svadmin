<script lang="ts">
  /**
   * LitePagination — Pure <a> tag pagination for SSR.
   * No JavaScript. All page transitions are full page navigations.
   */
  import { t } from '@svadmin/core/i18n';

  interface Props {
    page: number;
    totalPages: number;
    /** Base URL that page numbers will be appended to */
    baseUrl?: string;
    /** Additional parameters to preserve (like sort, order, q) */
    preserveParams?: Record<string, string>;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    page,
    totalPages,
    baseUrl = '',
    preserveParams = {},
    class: className = '',
  }: Props = $props();

  // Show max 7 page links
  const visiblePages = $derived.by(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  });

  function pageUrl(p: number): string {
    const params = new URLSearchParams(preserveParams);
    params.set('page', String(p));
    const qs = params.toString();
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${baseUrl && !baseUrl.includes('?') ? '?' : sep}${qs}`;
  }
</script>

{#if totalPages > 1}
  <nav class="lite-pagination {className}">
    {#if page > 1}
      <a href={pageUrl(page - 1)}>← {t('common.prev') || 'Prev'}</a>
    {:else}
      <span class="disabled">← {t('common.prev') || 'Prev'}</span>
    {/if}

    {#each visiblePages as p, _i (_i)}
      {#if p === '...'}
        <span class="disabled">…</span>
      {:else if p === page}
        <span class="active">{p}</span>
      {:else}
        <a href={pageUrl(p)}>{p}</a>
      {/if}
    {/each}

    {#if page < totalPages}
      <a href={pageUrl(page + 1)}>{t('common.next') || 'Next'} →</a>
    {:else}
      <span class="disabled">{t('common.next') || 'Next'} →</span>
    {/if}

    <span class="lite-pagination-info">
      {t('common.pageOf', { page, total: totalPages }) || `Page ${page} of ${totalPages}`}
    </span>
  </nav>
{/if}
