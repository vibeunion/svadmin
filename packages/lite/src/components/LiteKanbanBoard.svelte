<script lang="ts">
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
    class?: string;
  }

  let {
    columns = [],
    cards = [],
    formAction = '',
    class: className = '',
  }: Props = $props();
</script>

<div class="sv-lite-kanban-board {className}">
  {#each columns as col (col.id)}
    {@const colCards = cards.filter((c) => c.columnId === col.id)}
    <div class="sv-lite-kanban-column">
      <div class="sv-lite-column-header">
        <span class="sv-lite-column-title">{col.title}</span>
        <span class="sv-lite-column-count">({colCards.length})</span>
      </div>

      <div class="sv-lite-column-cards">
        {#each colCards as card (card.id)}
          <div class="sv-lite-kanban-card">
            <div class="sv-lite-card-title">{card.title}</div>
            {#if card.description}
              <div class="sv-lite-card-desc">{card.description}</div>
            {/if}
            <div class="sv-lite-card-meta">
              {#if card.priority}
                <span class="sv-lite-priority-badge sv-lite-{card.priority}">{card.priority}</span>
              {/if}
              {#each card.tags ?? [] as tag (tag)}
                <span class="sv-lite-tag-badge">#{tag}</span>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      {#if formAction}
        <form method="POST" action={formAction} class="sv-lite-card-form">
          <input type="hidden" name="columnId" value={col.id} />
          <input type="text" name="title" placeholder="+ Add card..." class="sv-lite-card-input" />
          <button type="submit" class="sv-lite-card-btn">Add</button>
        </form>
      {/if}
    </div>
  {/each}
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
