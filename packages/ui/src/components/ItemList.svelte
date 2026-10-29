<script lang="ts">
  import type { Snippet } from 'svelte';

  export type ListItem = {
    id: string;
    title: string;
    description?: string;
  };

  let {
    items,
    children,
  }: {
    items: ListItem[];
    children?: Snippet<[ListItem]>;
  } = $props();
</script>

<ul class="svadmin-item-list">
  {#each items as item (item.id)}
    <li class="svadmin-item-list__item">
      {#if children}
        {@render children(item)}
      {:else}
        <p class="svadmin-item-list__title">{item.title}</p>
        {#if item.description}<p class="svadmin-item-list__description">{item.description}</p>{/if}
      {/if}
    </li>
  {/each}
</ul>
