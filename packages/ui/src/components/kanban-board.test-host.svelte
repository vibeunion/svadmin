<script lang="ts">
  import { untrack } from 'svelte';
  import KanbanBoard, { type KanbanCard, type KanbanColumn } from './KanbanBoard.svelte';

  interface Props {
    columns: KanbanColumn[];
    initialCards?: KanbanCard[];
    oncardmove?: (cardId: string, targetColumnId: string, targetIndex: number) => KanbanCard | undefined | Promise<KanbanCard | undefined>;
    oncardmoveerror?: (error: unknown) => void;
    onCardsChange?: (cards: KanbanCard[]) => void;
  }

  let { columns, initialCards = [], oncardmove, oncardmoveerror, onCardsChange }: Props = $props();
  let cards = $state<KanbanCard[]>(untrack(() => initialCards));
  $effect(() => { onCardsChange?.(cards); });
</script>

<KanbanBoard {columns} bind:cards {oncardmove} {oncardmoveerror} />
