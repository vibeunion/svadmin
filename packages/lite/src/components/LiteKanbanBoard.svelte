<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  export interface KanbanCard {
    id: string;
    title: string;
    description?: string;
    columnId: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
  }

  export interface KanbanColumn {
    id: string;
    title: string;
  }

  interface Props {
    columns: KanbanColumn[];
    cards?: KanbanCard[];
    formAction?: string;
    loading?: boolean;
    error?: string;
    retryHref?: string;
    ariaLabel?: string;
    class?: string;
  }

  let {
    columns = [],
    cards = [],
    formAction = '',
    loading = false,
    error,
    retryHref,
    ariaLabel,
    class: className = '',
  }: Props = $props();
  const i18n = useTranslation();
  function text(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= 1000;
  }
  const validationError = $derived.by(() => {
    if (!Array.isArray(columns) || !Array.isArray(cards)) return 'kanban.invalidData';
    if (columns.length > 200 || cards.length > 1000) return 'kanban.limit';
    if (columns.some(column => !column || !text(column.id) || !text(column.title))) return 'kanban.invalidData';
    const ids = new Set(columns.map(column => column.id));
    if (ids.size !== columns.length) return 'kanban.invalidData';
    const cardIds = new Set<string>();
    for (const card of cards) {
      if (!card || !text(card.id) || !text(card.title) || !ids.has(card.columnId) || cardIds.has(card.id)
        || (card.description !== undefined && (typeof card.description !== 'string' || card.description.length > 10_000))
        || (card.tags !== undefined && (!Array.isArray(card.tags) || card.tags.length > 100 || !card.tags.every(text)))
        || (card.priority !== undefined && !['low', 'medium', 'high', 'urgent'].includes(card.priority))) return 'kanban.invalidData';
      cardIds.add(card.id);
    }
    return '';
  });
  const displayError = $derived(error || (validationError ? i18n.t(validationError) : ''));
  function localPath(value: string | undefined): string | undefined {
    return value && (value.startsWith('/') || value.startsWith('?'))
      && !/^\/[\\/]/.test(value) && !/[\\\u0000-\u0020\u007f]/.test(value) ? value : undefined;
  }
  const safeAction = $derived(localPath(formAction));
  const safeRetry = $derived(localPath(retryHref));
</script>

<div class="sv-lite-kanban-board {className}" role="region" aria-label={ariaLabel ?? i18n.t('kanban.label')} aria-busy={loading}>
  {#if loading}
    <div role="status">{i18n.t('common.loading')}</div>
  {:else if displayError}
    <div role="alert">{displayError}</div>
    {#if error && safeRetry}<a href={safeRetry}>{i18n.t('common.retry')}</a>{/if}
  {:else if columns.length === 0}
    <div role="status">{i18n.t('common.noData')}</div>
  {:else}
  {#each columns as col (col.id)}
    {@const colCards = cards.filter((c) => c.columnId === col.id)}
    <div class="sv-lite-kanban-column" role="region" aria-label={col.title}>
      <div class="sv-lite-column-header">
        <span class="sv-lite-column-title">{col.title}</span>
        <span class="sv-lite-column-count">({colCards.length})</span>
      </div>

      <div class="sv-lite-column-cards">
        {#each colCards as card (card.id)}
          <div class="sv-lite-kanban-card" role="group" aria-label={card.title}>
            <div class="sv-lite-card-title">{card.title}</div>
            {#if card.description}
              <div class="sv-lite-card-desc">{card.description}</div>
            {/if}
            <div class="sv-lite-card-meta">
              {#if card.priority}
                <span class="sv-lite-priority-badge sv-lite-{card.priority}">{card.priority}</span>
              {/if}
              {#each card.tags ?? [] as tag, index (index)}
                <span class="sv-lite-tag-badge">#{tag}</span>
              {/each}
            </div>
          </div>
        {:else}
          <div role="status">{i18n.t('common.noData')}</div>
        {/each}
      </div>

      {#if safeAction && cards.length < 1000}
        <form method="POST" action={safeAction} class="sv-lite-card-form" aria-label={i18n.t('kanban.addTo', { column: col.title })}>
          <input type="hidden" name="columnId" value={col.id} />
          <input type="text" name="title" aria-label={i18n.t('kanban.cardTitle')} placeholder={i18n.t('kanban.cardTitle')} required maxlength={1000} class="sv-lite-card-input" />
          <button type="submit" class="sv-lite-card-btn">{i18n.t('common.add')}</button>
        </form>
      {/if}
    </div>
  {/each}
  {/if}
</div>

<style>
  .sv-lite-kanban-board {
    display: block;
    white-space: nowrap;
    overflow-x: auto;
    padding-bottom: 12px;
    font-size: 12px;
  }
  .sv-lite-kanban-column {
    display: inline-block;
    vertical-align: top;
    width: 260px;
    margin-right: 12px;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px;
    white-space: normal;
    box-sizing: border-box;
  }
  .sv-lite-column-header {
    font-weight: bold;
    padding-bottom: 8px;
    border-bottom: 1px solid #cbd5e1;
    color: #1e293b;
    margin-bottom: 8px;
  }
  .sv-lite-column-count {
    color: #64748b;
    font-weight: normal;
    font-size: 11px;
    margin-left: 4px;
  }
  .sv-lite-kanban-card {
    background-color: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 8px;
  }
  .sv-lite-card-title {
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .sv-lite-card-desc {
    color: #64748b;
    font-size: 11px;
    margin-bottom: 6px;
  }
  .sv-lite-card-meta {
    padding-top: 4px;
    border-top: 1px solid #f1f5f9;
  }
  .sv-lite-priority-badge {
    display: inline-block;
    padding: 1px 4px;
    font-size: 10px;
    border-radius: 2px;
    text-transform: uppercase;
    margin-right: 4px;
  }
  .sv-lite-urgent, .sv-lite-high {
    background-color: #fee2e2;
    color: #991b1b;
  }
  .sv-lite-medium {
    background-color: #e0e7ff;
    color: #3730a3;
  }
  .sv-lite-low {
    background-color: #f1f5f9;
    color: #475569;
  }
  .sv-lite-tag-badge {
    display: inline-block;
    color: #64748b;
    font-size: 10px;
    margin-right: 4px;
  }
  .sv-lite-card-form {
    margin-top: 6px;
  }
  .sv-lite-card-input {
    width: 170px;
    padding: 4px 6px;
    font-size: 11px;
    border: 1px solid #cbd5e1;
    border-radius: 3px;
  }
  .sv-lite-card-btn {
    padding: 4px 8px;
    font-size: 11px;
    background-color: #4f46e5;
    color: #ffffff;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
</style>
