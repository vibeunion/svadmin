<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { useTranslation } from '@svadmin/core/i18n';
  import { listText } from './list-i18n.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> & {
    label: string;
    page: number;
    loadedCount: number;
    hasPrevious: boolean;
    hasNext: boolean;
    loading?: boolean | undefined;
    note?: string | undefined;
    sectionId?: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
    class?: string | undefined;
  };

  let {
    label,
    page,
    loadedCount,
    hasPrevious,
    hasNext,
    loading = false,
    note = '',
    sectionId,
    onPrevious,
    onNext,
    class: className = '',
    ...restProps
  }: Props = $props();

  const i18n = useTranslation();
</script>

<div {...restProps} class={`svadmin-cursor-list-footer ${className}`.trim()} data-svadmin-cursor-list-footer data-section={sectionId}>
  <div class="svadmin-cursor-list-footer__status" aria-live="polite">
    <span>{listText(i18n, 'cursorListFooter.loaded', { count: loadedCount })}</span>
    {#if note}<span class="svadmin-cursor-list-footer__note">{note}</span>{/if}
  </div>
  <div class="svadmin-cursor-list-footer__navigation" role="navigation" aria-label={listText(i18n, 'cursorListFooter.navigation', { label })}>
    <button type="button" class="svadmin-cursor-list-footer__control" disabled={loading || !hasPrevious}
      title={listText(i18n, hasPrevious ? 'cursorListFooter.previousAria' : 'cursorListFooter.firstPage', { label })}
      aria-label={listText(i18n, 'cursorListFooter.previousAria', { label })} onclick={onPrevious}>
      ← {listText(i18n, 'listPagination.previous')}
    </button>
    <span class="svadmin-cursor-list-footer__page">{listText(i18n, 'cursorListFooter.page', { page })}</span>
    <button type="button" class="svadmin-cursor-list-footer__control" disabled={loading || !hasNext}
      title={listText(i18n, hasNext ? 'cursorListFooter.nextAria' : 'cursorListFooter.nextUnavailable', { label })}
      aria-label={listText(i18n, 'cursorListFooter.nextAria', { label })} onclick={onNext}>
      {listText(i18n, 'listPagination.next')} →
    </button>
  </div>
</div>

<style>
  .svadmin-cursor-list-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem 1rem; min-width: 0; border-top: 1px solid var(--border); padding: .75rem 0 0; }
  .svadmin-cursor-list-footer__status { display: flex; align-items: baseline; flex-wrap: wrap; gap: .35rem .75rem; min-width: 0; font-size: .8125rem; color: var(--muted-foreground); }
  .svadmin-cursor-list-footer__note { color: var(--foreground); }
  .svadmin-cursor-list-footer__navigation { display: flex; align-items: center; gap: .5rem; }
  .svadmin-cursor-list-footer__control { min-width: 2.25rem; min-height: 2.25rem; border: 1px solid var(--border); border-radius: .375rem; background: var(--background); color: inherit; padding: 0 .75rem; cursor: pointer; font: inherit; font-size: .8125rem; }
  .svadmin-cursor-list-footer__control:hover:not(:disabled) { border-color: var(--ring); color: var(--primary); }
  .svadmin-cursor-list-footer__control:disabled { cursor: not-allowed; opacity: .55; }
  .svadmin-cursor-list-footer__page { min-width: 4rem; color: var(--muted-foreground); font-size: .8125rem; text-align: center; }
</style>
