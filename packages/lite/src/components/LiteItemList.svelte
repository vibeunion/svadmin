<script lang="ts">
  interface ListItem {
    id: string;
    title: string;
    description?: string;
    href?: string;
    meta?: string;
  }

  interface Props {
    items: ListItem[];
    title?: string;
    emptyText?: string;
  }

  let { items, title, emptyText = 'No items' }: Props = $props();
</script>

<section class="lite-item-list lite-card">
  {#if title}<h2>{title}</h2>{/if}
  {#if items.length === 0}
    <p class="lite-muted">{emptyText}</p>
  {:else}
    <ul>
      {#each items as item (item.id)}
        <li>
          <div>
            {#if item.href}<a href={item.href}>{item.title}</a>{:else}<strong>{item.title}</strong>{/if}
            {#if item.description}<p>{item.description}</p>{/if}
          </div>
          {#if item.meta}<span>{item.meta}</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .lite-item-list { padding: 0; overflow: hidden; }
  .lite-item-list h2 { margin: 0; padding: 12px 16px; border-bottom: 1px solid #E5E6EB; color: #1D2129; font-size: 14px; }
  .lite-item-list > p { margin: 0; padding: 16px; }
  .lite-item-list ul { margin: 0; padding: 0; list-style: none; }
  .lite-item-list li { display: flex; align-items: flex-start; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #F2F3F5; }
  .lite-item-list li:last-child { border-bottom: 0; }
  .lite-item-list a, .lite-item-list strong { color: #1D2129; font-size: 13px; }
  .lite-item-list p { margin: 4px 0 0; color: #4E5969; font-size: 12px; line-height: 1.5; }
  .lite-item-list li > span { color: #86909C; font-size: 12px; white-space: nowrap; }

  .lite-item-list li > * + * { margin-left: 12px; }
</style>
