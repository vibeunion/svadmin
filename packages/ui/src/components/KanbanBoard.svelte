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

<div class={cn('svadmin-u-60fbb7713999 svadmin-u-0c3bc98565dd svadmin-u-1384f66f41d0 svadmin-u-9fcd8a13827e svadmin-u-359090c2d529 svadmin-u-7f6912283f11', className)}>
  {#each columns as col (col.id)}
    {@const colCards = cards.filter((c) => c.columnId === col.id)}
    <div
      role="region"
      aria-label={col.title}
      class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-92e13d146fd7 svadmin-u-012fbd121f37 svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-22bb278694b4 svadmin-u-7f351d50b6e6 svadmin-u-cef5b893cf23 svadmin-u-a4805b5f5b63"
      ondragover={handleDragOver}
      ondrop={() => handleDrop(col.id)}
    >
      <!-- Column Header -->
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-eb6e8b881acd svadmin-u-65fdbade2025 svadmin-u-591f378e24a1">
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">
          <span>{col.title}</span>
          <span class="svadmin-u-60fbb7713999 svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219 svadmin-u-1dc571a3609f svadmin-u-0e65706bcccd svadmin-u-bfa603190748">
            {colCards.length}
          </span>
        </div>

        {#if allowAddCard}
          <Button
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
        {#each colCards as card (card.id)}
          <div
            role="button"
            tabindex="0"
            draggable="true"
            class={cn(
              'group svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-77a2a20e90d4 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-cd0ad9a56558 svadmin-u-eb6e8b881acd svadmin-u-cef5b893cf23 svadmin-u-0fe7d7d814d0 svadmin-u-8d08385288a6 svadmin-u-d9bff91ef7ee svadmin-u-512e82e6a68f svadmin-u-ab1dd417ce7d svadmin-u-2eba0d65d059',
              draggedCardId === card.id ? 'svadmin-u-2a2db4667b27 svadmin-u-16b1efa5875e svadmin-u-2691847b25ed' : ''
            )}
            ondragstart={(e) => handleDragStart(e, card.id)}
            onclick={() => oncardclick?.(card)}
            onkeydown={(e) => { if (e.key === 'Enter') oncardclick?.(card); }}
          >
            <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4">
              <div class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-e25ca6535dea">{card.title}</div>
              <GripVertical class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-52183a1cca53 svadmin-u-7065497e1ca0 svadmin-u-181f3d6c9821 svadmin-u-67d6184a0024 svadmin-u-012fbd121f37" />
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
                {#each card.tags ?? [] as tag (tag)}
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
          </div>
        {/each}

        {#if addingColumnId === col.id}
          <div class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-f5583b2907be svadmin-u-cd0ad9a56558 svadmin-u-9fe52d5d506c svadmin-u-6f7e013d6499 svadmin-u-cef5b893cf23">
            <textarea
              bind:value={newCardTitle}
              placeholder="Card title..."
              rows={2}
              class="svadmin-u-6da6a3c3f741 svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-cd009d7d208c svadmin-u-359090c2d529 svadmin-u-d4108abe6359 svadmin-u-9c24ab70af61 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a svadmin-u-6aef32016896"
              onkeydown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitAddCard(col.id);
                } else if (e.key === 'Escape') {
                  addingColumnId = null;
                }
              }}
            ></textarea>
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77c08e015d14 svadmin-u-58284b4ea568">
              <Button variant="ghost" size="sm" class="svadmin-u-f6fe902450dc svadmin-u-d058ca6de60f svadmin-u-d5eab218aa34" onclick={() => { addingColumnId = null; }}>Cancel</Button>
              <Button size="sm" class="svadmin-u-f6fe902450dc svadmin-u-d058ca6de60f svadmin-u-d5eab218aa34" onclick={() => submitAddCard(col.id)}>Add</Button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>
