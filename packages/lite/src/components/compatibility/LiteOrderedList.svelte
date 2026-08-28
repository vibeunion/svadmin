<script lang="ts">
  import { toSafeHref } from '../../security';

  interface Item {
    id: string | number;
    label: string;
    description?: string;
  }

  interface Props {
    items: Item[];
    action: string;
    title?: string;
    itemName?: string;
  }

  let { items, action, title = 'Ordered items', itemName = 'itemId' }: Props = $props();
  const safeAction = $derived(toSafeHref(action));
</script>

<section class="lite-card lite-ordered-list">
  <h2>{title}</h2>
  <ol>
    {#each items as item, index (item.id)}
      <li>
        <div><strong>{item.label}</strong>{#if item.description}<span>{item.description}</span>{/if}</div>
        <div class="lite-inline-actions">
          {#if safeAction}
            <form method="POST" action={safeAction}>
              <input type="hidden" name={itemName} value={String(item.id)} />
              <input type="hidden" name="direction" value="up" />
              <button class="lite-btn lite-btn-sm" type="submit" disabled={index === 0}>Move up</button>
            </form>
            <form method="POST" action={safeAction}>
              <input type="hidden" name={itemName} value={String(item.id)} />
              <input type="hidden" name="direction" value="down" />
              <button class="lite-btn lite-btn-sm" type="submit" disabled={index === items.length - 1}>Move down</button>
            </form>
          {:else}
            <button class="lite-btn lite-btn-sm" type="button" disabled>Move up</button>
            <button class="lite-btn lite-btn-sm" type="button" disabled>Move down</button>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
</section>
