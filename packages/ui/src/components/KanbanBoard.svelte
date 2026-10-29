<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Plus, GripVertical, RotateCw, ArrowUp, ArrowDown } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import { snapshotPlainData } from '@svadmin/core/schema';
  import { onDestroy } from 'svelte';

  export interface KanbanCard {
    id: string;
    title: string;
    description?: string;
    columnId: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    assignee?: { name: string; avatar?: string };
    dueDate?: string;
  }

  export interface KanbanColumn {
    id: string;
    title: string;
    colorBadge?: string;
  }

  interface Props {
    columns: KanbanColumn[];
    cards?: KanbanCard[];
    allowAddCard?: boolean;
    oncardmove?: ((cardId: string, targetColumnId: string, targetIndex: number) => KanbanCard | undefined | Promise<KanbanCard | undefined>) | undefined;
    canMoveCard?: (card: KanbanCard, targetColumnId: string) => boolean;
    oncardmoveerror?: ((error: unknown) => void) | undefined;
    oncardclick?: (card: KanbanCard) => void;
    oncardadd?: (columnId: string, title: string) => KanbanCard | Promise<KanbanCard>;
    scopeKey?: string | number;
    loading?: boolean;
    error?: string | undefined;
    onRetry?: () => void;
    ariaLabel?: string;
    class?: string;
  }

  let {
    columns = [],
    cards = $bindable([]),
    allowAddCard = true,
    oncardmove,
    canMoveCard,
    oncardmoveerror,
    oncardclick,
    oncardadd,
    scopeKey,
    loading = false,
    error,
    onRetry,
    ariaLabel,
    class: className = '',
  }: Props = $props();

  let draggedCardId = $state<string | null>(null);
  let addingColumnId = $state<string | null>(null);
  let newCardTitle = $state('');
  let movingCardId = $state<string | null>(null);
  let moveError = $state<string | null>(null);
  let failedMove = $state<{ cardId: string; targetColumnId: string; targetIndex: number } | null>(null);
  let adding = $state(false);
  let mounted = true;
  const i18n = useTranslation();
  const invalidData = $derived.by(() => {
    if (!Array.isArray(columns) || !Array.isArray(cards)) return 'kanban.invalidData';
    if (columns.length > 200 || cards.length > 1000) return 'kanban.limit';
    if (columns.some(column => !column || !validText(column.id) || !validText(column.title))) return 'kanban.invalidData';
    const columnIds = new Set(columns.map(column => column.id));
    if (columnIds.size !== columns.length) return 'kanban.invalidData';
    const cardIds = new Set<string>();
    for (const card of cards) {
      if (!validCard(card) || cardIds.has(card.id) || !columnIds.has(card.columnId)) return 'kanban.invalidData';
      cardIds.add(card.id);
    }
    return '';
  });
  const displayError = $derived(error || (invalidData ? i18n.t(invalidData) : ''));
  const fingerprint = $derived(invalidData ? '' : JSON.stringify([columns.map(column => ({ id: column.id, title: column.title })), cards.map(card => ({
    id: card.id, title: card.title, columnId: card.columnId, description: card.description,
    priority: card.priority, tags: card.tags, assignee: card.assignee?.name, dueDate: card.dueDate,
  }))]));
  const scope = $derived({ scopeKey, cards, columns, fingerprint, loading, error, oncardmove, oncardadd, canMoveCard, allowAddCard });
  let operation = $state.raw<{ scope: typeof scope; preview?: KanbanCard[] }>();
  const currentOperation = $derived(operation?.scope === scope);
  const busy = $derived(currentOperation && (movingCardId !== null || adding));
  const visibleCards = $derived(currentOperation && operation?.preview ? operation.preview : cards);

  function validText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= 1000;
  }
  function validCard(card: KanbanCard): boolean {
    return !!card && validText(card.id) && validText(card.title) && validText(card.columnId)
      && (card.description === undefined || (typeof card.description === 'string' && card.description.length <= 10_000))
      && (card.tags === undefined || (Array.isArray(card.tags) && card.tags.length <= 100 && card.tags.every(validText)))
      && (card.assignee === undefined || (!!card.assignee && validText(card.assignee.name)))
      && (card.dueDate === undefined || typeof card.dueDate === 'string')
      && (card.priority === undefined || ['low', 'medium', 'high', 'urgent'].includes(card.priority));
  }
  function decodeMoveReceipt(receipt: unknown): KanbanCard | undefined {
    if (receipt === undefined) return undefined;
    if (receipt === null || typeof receipt !== 'object' || Array.isArray(receipt)) {
      throw new Error('Invalid move receipt');
    }
    // 将已提交卡片与回调持有方的可变对象图分离，避免别名修改已提交状态。
    const snapshot = snapshotPlainData(receipt);
    if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      throw new Error('Invalid move receipt');
    }
    return snapshot as unknown as KanbanCard;
  }
  function moveAllowed(card: KanbanCard, targetColumn: string): boolean {
    if (!oncardmove || loading || displayError || busy || !columns.some(column => column.id === targetColumn)) return false;
    try { return canMoveCard === undefined || canMoveCard(card, targetColumn) === true; }
    catch { return false; }
  }
  function canDragCard(card: KanbanCard): boolean {
    return !!oncardmove && !loading && !displayError && !busy && columns.some(column => moveAllowed(card, column.id));
  }
  function active(origin: typeof scope): boolean {
    return mounted && origin === scope;
  }
  $effect.pre(() => {
    void scope;
    draggedCardId = null;
    addingColumnId = null;
    newCardTitle = '';
    moveError = null;
    failedMove = null;
  });
  onDestroy(() => { mounted = false; });

  function handleDragStart(e: DragEvent, cardId: string) {
    const card = cards.find((c) => c.id === cardId);
    if (!card || !canDragCard(card)) { e.preventDefault(); return; }
    draggedCardId = cardId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cardId);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  async function moveCard(cardId: string, targetColId: string, targetIndex = Number.MAX_SAFE_INTEGER) {
    const card = cards.find((c) => c.id === cardId);
    if (!card || !moveAllowed(card, targetColId)) return;
    const source = [...cards];
    const without = source.filter(item => item.id !== card.id);
    const targetCards = without.filter(item => item.columnId === targetColId);
    const index = Math.min(Math.max(0, targetIndex), targetCards.length);
    if (card.columnId === targetColId && source.filter(item => item.columnId === targetColId).findIndex(item => item.id === card.id) === index) return;
    const destination = { ...card, columnId: targetColId };
    const optimistic = [...without.filter(item => item.columnId !== targetColId), ...targetCards.slice(0, index), destination, ...targetCards.slice(index)];
    const changed = source.length !== optimistic.length || source.some((item, i) => item.id !== optimistic[i]?.id || item.columnId !== optimistic[i]?.columnId);
    if (!changed) return;
    const origin = scope;
    const current = { scope: origin, preview: optimistic };
    operation = current;
    adding = false;
    movingCardId = card.id;
    moveError = null;
    failedMove = null;
    try {
      const receipt = await origin.oncardmove?.(card.id, targetColId, index);
      if (!active(origin) || operation !== current) return;
      let confirmed = optimistic;
      if (receipt !== undefined) {
        const authoritative = decodeMoveReceipt(receipt);
        if (!authoritative || !validCard(authoritative) || authoritative.id !== card.id || authoritative.columnId !== targetColId) {
          throw new Error('Invalid move receipt');
        }
        confirmed = optimistic.map(item => item.id === card.id ? authoritative : item);
      }
      cards = confirmed;
    } catch (cause) {
      if (active(origin) && operation === current) {
        moveError = i18n.t('kanban.moveFailed');
        failedMove = { cardId: card.id, targetColumnId: targetColId, targetIndex: index };
        try { oncardmoveerror?.(cause); } catch { /* 错误观察者不能再次触发写入。 */ }
      }
    } finally {
      if (operation === current) { operation = undefined; movingCardId = null; }
    }
  }

  function retryFailedMove() {
    const failed = failedMove;
    if (!failed || busy) return;
    void moveCard(failed.cardId, failed.targetColumnId, failed.targetIndex);
  }

  function handleDrop(targetColId: string, index?: number) {
    const id = draggedCardId;
    draggedCardId = null;
    if (id) void moveCard(id, targetColId, index);
  }

  async function submitAddCard(columnId: string) {
    if (!validText(newCardTitle) || !oncardadd || !allowAddCard || busy || loading || displayError || cards.length >= 1000) return;
    const origin = scope;
    const current = { scope: origin };
    operation = current;
    movingCardId = null;
    adding = true;
    moveError = null;
    try {
      const newCard = await origin.oncardadd?.(columnId, newCardTitle.trim());
      if (!active(origin) || operation !== current) return;
      if (!newCard || !validCard(newCard) || newCard.columnId !== columnId || cards.some(card => card.id === newCard.id)) {
        throw new Error('Invalid card receipt');
      }
      cards = [...cards, newCard];
      newCardTitle = '';
      addingColumnId = null;
    } catch {
      if (active(origin) && operation === current) moveError = i18n.t('kanban.addFailed');
    } finally {
      if (operation === current) { operation = undefined; adding = false; }
    }
  }

  function getPriorityClass(priority?: string) {
    switch (priority) {
      case 'urgent':
        return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'high':
        return 'bg-warning/15 text-warning border-warning/30';
      case 'medium':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-border/40';
    }
  }
</script>

{#if moveError}<div role="alert"><span>{moveError}</span>{#if failedMove}<Button type="button" variant="ghost" size="sm" disabled={busy} onclick={retryFailedMove}>{i18n.t('common.retry')}</Button>{/if}</div>{/if}
<div role="region" aria-label={ariaLabel ?? i18n.t('kanban.label')} aria-busy={loading || busy}
  class={cn('svadmin-kanban flex gap-4 overflow-x-auto pb-4 text-xs select-none', className)}>
  {#if loading}
    <div role="status">{i18n.t('common.loading')}</div>
  {:else if displayError}
    <div role="alert">{displayError}</div>
    {#if error && onRetry}
      <Button type="button" variant="ghost" size="sm" onclick={onRetry}><RotateCw aria-hidden="true" />{i18n.t('common.retry')}</Button>
    {/if}
  {:else if columns.length === 0}
    <div role="status">{i18n.t('common.noData')}</div>
  {:else}
  {#each columns as col (col.id)}
    {@const colCards = visibleCards.filter((c) => c.columnId === col.id)}
    <div
      role="region"
      aria-label={col.title}
      class="svadmin-kanban__column flex flex-col w-72 shrink-0 border max-h-[80vh]"
      ondragover={handleDragOver}
      ondrop={(event) => { event.preventDefault(); handleDrop(col.id); }}
    >
      <!-- Column Header -->
      <div class="flex items-center justify-between p-3 border-b border-border/50">
        <div class="flex items-center gap-2 font-semibold text-foreground">
          <span>{col.title}</span>
          <span class="svadmin-kanban__count flex h-5 w-5 items-center justify-center bg-muted text-[10px] font-mono text-muted-foreground">
            {colCards.length}
          </span>
        </div>

        {#if allowAddCard && oncardadd}
          <Button
            type="button"
            disabled={busy || cards.length >= 1000}
            aria-label={i18n.t('kanban.addTo', { column: col.title })}
            title={i18n.t('kanban.addTo', { column: col.title })}
            variant="ghost"
            size="sm"
            class="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onclick={() => {
              addingColumnId = col.id;
              newCardTitle = '';
            }}
          >
            <Plus class="h-3.5 w-3.5" />
          </Button>
        {/if}
      </div>

      <!-- Column Card List -->
      <div class="flex-1 overflow-y-auto p-2 space-y-2 min-h-24">
        {#each colCards as card, cardIndex (card.id)}
          <div
            role="group"
            aria-label={card.title}
            aria-busy={busy && movingCardId === card.id}
            draggable={canDragCard(card)}
            class={cn(
              'svadmin-kanban__card group relative flex flex-col gap-2 border border-border/60 bg-card p-3 transition-all cursor-grab active:cursor-grabbing hover:border-border hover:shadow-sm text-left',
              draggedCardId === card.id ? 'opacity-40 ring-2 ring-primary/40' : ''
            )}
            ondragstart={(e) => handleDragStart(e, card.id)}
            ondragend={() => { draggedCardId = null; }}
            ondragover={handleDragOver}
            ondrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(col.id, cardIndex); }}
          >
            <div class="flex items-start justify-between gap-2">
              {#if oncardclick}
                <button type="button" disabled={busy} onclick={() => oncardclick?.(card)} class="font-medium text-foreground leading-snug">{card.title}</button>
              {:else}
                <div class="font-medium text-foreground leading-snug">{card.title}</div>
              {/if}
              {#if oncardmove}<GripVertical aria-hidden="true" class="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />{/if}
            </div>

            {#if card.description}
              <div class="text-[11px] text-muted-foreground line-clamp-2">{card.description}</div>
            {/if}

            <div class="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-border/40 text-[10px]">
              <div class="flex flex-wrap items-center gap-1">
                {#if card.priority}
                  <Badge variant="outline" class={cn('px-1 py-0 font-mono font-medium', getPriorityClass(card.priority))}>
                    {card.priority}
                  </Badge>
                {/if}
                {#each card.tags ?? [] as tag, tagIndex (tagIndex)}
                  <span class="rounded bg-muted/60 px-1 py-0.5 text-muted-foreground">#{tag}</span>
                {/each}
              </div>

              {#if card.assignee}
                <div class="flex items-center gap-1 text-muted-foreground">
                  <div class="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-semibold text-primary">
                    {card.assignee.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span class="truncate max-w-16">{card.assignee.name}</span>
                </div>
              {/if}
            </div>
            {#if oncardmove}
              <div class="flex items-center gap-2">
                <select aria-label={i18n.t('kanban.move', { card: card.title })} value={card.columnId} disabled={busy}
                  style="min-width: 0; max-width: 100%;"
                  onchange={(event) => {
                    const target = event.currentTarget.value;
                    event.currentTarget.value = card.columnId;
                    void moveCard(card.id, target);
                  }}>
                  {#each columns as destination (destination.id)}
                    <option value={destination.id} disabled={destination.id !== card.columnId && !moveAllowed(card, destination.id)}>{destination.title}</option>
                  {/each}
                </select>
                <Button type="button" variant="ghost" size="icon-sm" title={i18n.t('common.moveUp')}
                  aria-label={i18n.t('common.moveUp')} disabled={cardIndex === 0 || !moveAllowed(card, col.id)}
                  onclick={() => void moveCard(card.id, col.id, cardIndex - 1)}><ArrowUp aria-hidden="true" /></Button>
                <Button type="button" variant="ghost" size="icon-sm" title={i18n.t('common.moveDown')}
                  aria-label={i18n.t('common.moveDown')} disabled={cardIndex === colCards.length - 1 || !moveAllowed(card, col.id)}
                  onclick={() => void moveCard(card.id, col.id, cardIndex + 1)}><ArrowDown aria-hidden="true" /></Button>
              </div>
            {/if}
          </div>
        {:else}
          <div role="status">{i18n.t('common.noData')}</div>
        {/each}

        {#if addingColumnId === col.id}
          <div class="svadmin-kanban__composer border border-primary/40 bg-card p-2.5 space-y-2">
            <textarea
              bind:value={newCardTitle}
              aria-label={i18n.t('kanban.cardTitle')}
              placeholder={i18n.t('kanban.cardTitle')}
              maxlength={1000}
              disabled={busy}
              rows={2}
              class="w-full rounded border border-input bg-background p-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              onkeydown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !e.repeat) {
                  e.preventDefault();
                  submitAddCard(col.id);
                } else if (e.key === 'Escape') {
                  addingColumnId = null;
                }
              }}
            ></textarea>
            <div class="flex items-center justify-end gap-1.5">
              <Button type="button" disabled={busy} variant="ghost" size="sm" class="h-6 text-[11px] px-2" onclick={() => { addingColumnId = null; }}>{i18n.t('common.cancel')}</Button>
              <Button type="button" disabled={busy || !validText(newCardTitle)} size="sm" class="h-6 text-[11px] px-2" onclick={() => submitAddCard(col.id)}>{i18n.t('common.add')}</Button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/each}
  {/if}
</div>
