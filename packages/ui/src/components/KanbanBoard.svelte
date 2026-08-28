<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Plus, GripVertical } from '@lucide/svelte';
  import { cn } from '../utils.js';

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
    oncardmove?: (cardId: string, targetColumnId: string) => void;
    oncardclick?: (card: KanbanCard) => void;
    oncardadd?: (columnId: string, title: string) => void;
    class?: string;
  }

  let {
    columns = [],
    cards = $bindable([]),
    allowAddCard = true,
    oncardmove,
    oncardclick,
    oncardadd,
    class: className = '',
  }: Props = $props();

  let draggedCardId = $state<string | null>(null);
  let addingColumnId = $state<string | null>(null);
  let newCardTitle = $state('');

  function handleDragStart(e: DragEvent, cardId: string) {
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

  function handleDrop(targetColId: string) {
    if (!draggedCardId) return;
    const card = cards.find((c) => c.id === draggedCardId);
    if (card && card.columnId !== targetColId) {
      cards = cards.map((c) =>
        c.id === draggedCardId ? { ...c, columnId: targetColId } : c
      );
      oncardmove?.(draggedCardId, targetColId);
    }
    draggedCardId = null;
  }

  function submitAddCard(columnId: string) {
    if (!newCardTitle.trim()) {
      addingColumnId = null;
      return;
    }
    const newCard: KanbanCard = {
      id: `k_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newCardTitle.trim(),
      columnId,
    };
    cards = [...cards, newCard];
    oncardadd?.(columnId, newCardTitle.trim());
    newCardTitle = '';
    addingColumnId = null;
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

<div class={cn('flex gap-4 overflow-x-auto pb-4 text-xs select-none', className)}>
  {#each columns as col (col.id)}
    {@const colCards = cards.filter((c) => c.columnId === col.id)}
    <div
      role="region"
      aria-label={col.title}
      class="flex flex-col w-72 shrink-0 rounded-xl border border-border/70 bg-card/60 shadow-xs max-h-[80vh]"
      ondragover={handleDragOver}
      ondrop={() => handleDrop(col.id)}
    >
      <!-- Column Header -->
      <div class="flex items-center justify-between p-3 border-b border-border/50">
        <div class="flex items-center gap-2 font-semibold text-foreground">
          <span>{col.title}</span>
          <span class="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-mono text-muted-foreground">
            {colCards.length}
          </span>
        </div>

        {#if allowAddCard}
          <Button
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
        {#each colCards as card (card.id)}
          <div
            role="button"
            tabindex="0"
            draggable="true"
            class={cn(
              'group relative flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3 shadow-xs transition-all cursor-grab active:cursor-grabbing hover:border-border hover:shadow-sm text-left',
              draggedCardId === card.id ? 'opacity-40 ring-2 ring-primary/40' : ''
            )}
            ondragstart={(e) => handleDragStart(e, card.id)}
            onclick={() => oncardclick?.(card)}
            onkeydown={(e) => { if (e.key === 'Enter') oncardclick?.(card); }}
          >
            <div class="flex items-start justify-between gap-2">
              <div class="font-medium text-foreground leading-snug">{card.title}</div>
              <GripVertical class="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>

            {#if card.description}
              <div class="text-[11px] text-muted-foreground line-clamp-2">{card.description}</div>
            {/if}

            <div class="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-border/40 text-[10px]">
              <div class="flex flex-wrap items-center gap-1">
                {#if card.priority}
                  <Badge variant="outline" class={cn('text-[9px] px-1 py-0 uppercase font-mono font-medium', getPriorityClass(card.priority))}>
                    {card.priority}
                  </Badge>
                {/if}
                {#each card.tags ?? [] as tag (tag)}
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
          </div>
        {/each}

        {#if addingColumnId === col.id}
          <div class="rounded-lg border border-primary/40 bg-card p-2.5 space-y-2 shadow-xs">
            <textarea
              bind:value={newCardTitle}
              placeholder="Card title..."
              rows={2}
              class="w-full rounded border border-input bg-background p-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              onkeydown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitAddCard(col.id);
                } else if (e.key === 'Escape') {
                  addingColumnId = null;
                }
              }}
            ></textarea>
            <div class="flex items-center justify-end gap-1.5">
              <Button variant="ghost" size="sm" class="h-6 text-[11px] px-2" onclick={() => { addingColumnId = null; }}>Cancel</Button>
              <Button size="sm" class="h-6 text-[11px] px-2" onclick={() => submitAddCard(col.id)}>Add</Button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>
