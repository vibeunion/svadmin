<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Plus, GripVertical, RotateCw, ArrowUp, ArrowDown } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core/i18n';
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
    oncardmove?: (cardId: string, targetColumnId: string, targetIndex: number) => void | Promise<void>;
    canMoveCard?: (card: KanbanCard, targetColumnId: string) => boolean;
    oncardmoveerror?: (error: unknown) => void;
    oncardclick?: (card: KanbanCard) => void;
    oncardadd?: (columnId: string, title: string) => KanbanCard | Promise<KanbanCard>;
    scopeKey?: string | number;
    loading?: boolean;
    error?: string;
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
  function moveAllowed(card: KanbanCard, targetColumn: string): boolean {
    if (!oncardmove || loading || displayError || busy || !columns.some(column => column.id === targetColumn)) return false;
    try { return canMoveCard === undefined || canMoveCard(card, targetColumn) === true; }
    catch { return false; }
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
  });
  onDestroy(() => { mounted = false; });

  function handleDragStart(e: DragEvent, cardId: string) {
    if (!oncardmove || busy || loading || displayError) { e.preventDefault(); return; }
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
    try {
      await origin.oncardmove?.(card.id, targetColId, index);
      if (active(origin) && operation === current) cards = optimistic;
    } catch (cause) {
      if (active(origin) && operation === current) {
        moveError = i18n.t('kanban.moveFailed');
        try { oncardmoveerror?.(cause); } catch { /* 错误观察者不能再次触发写入。 */ }
      }
    } finally {
      if (operation === current) { operation = undefined; movingCardId = null; }
    }
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
        return 'svadmin-u-c698f77c9ba5 svadmin-u-811148b13d1e svadmin-u-9d5d8b4711b4';
      case 'high':
        return 'svadmin-u-d9c3c520f7d5 svadmin-u-918184635b1d svadmin-u-2f960aa0c478';
      case 'medium':
        return 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-a6afccfc915b';
      default:
        return 'svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748 svadmin-u-6ee2d41e2d2d';
    }
  }
</script>

{#if moveError}<div role="alert">{moveError}</div>{/if}
<div role="region" aria-label={ariaLabel ?? i18n.t('kanban.label')} aria-busy={loading || busy}
  class={cn('svadmin-u-60fbb7713999 svadmin-u-0c3bc98565dd svadmin-u-1384f66f41d0 svadmin-u-9fcd8a13827e svadmin-u-359090c2d529 svadmin-u-7f6912283f11', className)}>
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
      class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-92e13d146fd7 svadmin-u-012fbd121f37 svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-22bb278694b4 svadmin-u-7f351d50b6e6 svadmin-u-cef5b893cf23 svadmin-u-a4805b5f5b63"
      ondragover={handleDragOver}
      ondrop={(event) => { event.preventDefault(); handleDrop(col.id); }}
    >
      <!-- Column Header -->
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-eb6e8b881acd svadmin-u-65fdbade2025 svadmin-u-591f378e24a1">
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">
          <span>{col.title}</span>
          <span class="svadmin-u-60fbb7713999 svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219 svadmin-u-1dc571a3609f svadmin-u-0e65706bcccd svadmin-u-bfa603190748">
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
            class="svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-8a539c7fe216 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e"
            onclick={() => {
              addingColumnId = col.id;
              newCardTitle = '';
            }}
          >
            <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          </Button>
        {/if}
      </div>

      <!-- Column Card List -->
      <div class="svadmin-u-36e579c0b41c svadmin-u-92bf82f493b1 svadmin-u-7660b450905a svadmin-u-6f7e013d6499 svadmin-u-53ecdb131b58">
        {#each colCards as card, cardIndex (card.id)}
          <div
            role="group"
            aria-label={card.title}
            aria-busy={busy && movingCardId === card.id}
            draggable={!!oncardmove && !busy}
            class={cn(
              'group svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-77a2a20e90d4 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-cd0ad9a56558 svadmin-u-eb6e8b881acd svadmin-u-cef5b893cf23 svadmin-u-0fe7d7d814d0 svadmin-u-8d08385288a6 svadmin-u-d9bff91ef7ee svadmin-u-512e82e6a68f svadmin-u-ab1dd417ce7d svadmin-u-2eba0d65d059',
              draggedCardId === card.id ? 'svadmin-u-2a2db4667b27 svadmin-u-16b1efa5875e svadmin-u-2691847b25ed' : ''
            )}
            ondragstart={(e) => handleDragStart(e, card.id)}
            ondragend={() => { draggedCardId = null; }}
            ondragover={handleDragOver}
            ondrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(col.id, cardIndex); }}
          >
            <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4">
              {#if oncardclick}
                <button type="button" disabled={busy} onclick={() => oncardclick?.(card)} class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-e25ca6535dea">{card.title}</button>
              {:else}
                <div class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-e25ca6535dea">{card.title}</div>
              {/if}
              {#if oncardmove}<GripVertical aria-hidden="true" class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-52183a1cca53 svadmin-u-7065497e1ca0 svadmin-u-181f3d6c9821 svadmin-u-67d6184a0024 svadmin-u-012fbd121f37" />{/if}
            </div>

            {#if card.description}
              <div class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-054cb4e36116">{card.description}</div>
            {/if}

            <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-58284b4ea568 svadmin-u-6b7d6e21ccbd svadmin-u-b950dda299d3 svadmin-u-6ee2d41e2d2d svadmin-u-1dc571a3609f">
              <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421">
                {#if card.priority}
                  <Badge variant="outline" class={cn('svadmin-u-e09880869d1f svadmin-u-d8e0e382c67b svadmin-u-68ecb30dbec6 uppercase svadmin-u-0e65706bcccd svadmin-u-2689f3958069', getPriorityClass(card.priority))}>
                    {card.priority}
                  </Badge>
                {/if}
                {#each card.tags ?? [] as tag, tagIndex (tagIndex)}
                  <span class="svadmin-u-07389a777c1f svadmin-u-706701550477 svadmin-u-d8e0e382c67b svadmin-u-465609a240a8 svadmin-u-bfa603190748">#{tag}</span>
                {/each}
              </div>

              {#if card.assignee}
                <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-bfa603190748">
                  <div class="svadmin-u-60fbb7713999 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-6a1572b6bf5a svadmin-u-e09880869d1f svadmin-u-e83a7042bc91 svadmin-u-20aaf08a7ed1">
                    {card.assignee.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span class="svadmin-u-f283ea9bea0e svadmin-u-2534f14adad5">{card.assignee.name}</span>
                </div>
              {/if}
            </div>
            {#if oncardmove}
              <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
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
          <div class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-f5583b2907be svadmin-u-cd0ad9a56558 svadmin-u-9fe52d5d506c svadmin-u-6f7e013d6499 svadmin-u-cef5b893cf23">
            <textarea
              bind:value={newCardTitle}
              aria-label={i18n.t('kanban.cardTitle')}
              placeholder={i18n.t('kanban.cardTitle')}
              maxlength={1000}
              disabled={busy}
              rows={2}
              class="svadmin-u-6da6a3c3f741 svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-cd009d7d208c svadmin-u-359090c2d529 svadmin-u-d4108abe6359 svadmin-u-9c24ab70af61 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a svadmin-u-6aef32016896"
              onkeydown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !e.repeat) {
                  e.preventDefault();
                  submitAddCard(col.id);
                } else if (e.key === 'Escape') {
                  addingColumnId = null;
                }
              }}
            ></textarea>
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77c08e015d14 svadmin-u-58284b4ea568">
              <Button type="button" disabled={busy} variant="ghost" size="sm" class="svadmin-u-f6fe902450dc svadmin-u-d058ca6de60f svadmin-u-d5eab218aa34" onclick={() => { addingColumnId = null; }}>{i18n.t('common.cancel')}</Button>
              <Button type="button" disabled={busy || !validText(newCardTitle)} size="sm" class="svadmin-u-f6fe902450dc svadmin-u-d058ca6de60f svadmin-u-d5eab218aa34" onclick={() => submitAddCard(col.id)}>{i18n.t('common.add')}</Button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/each}
  {/if}
</div>
