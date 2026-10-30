<script lang="ts">
  export interface MenuEntry {
    id: string;
    label: string;
    href?: string;
    disabled?: boolean;
    badge?: string | number;
    children?: MenuEntry[];
  }

  interface Props {
    items: MenuEntry[];
    selected?: string;
    depth?: number;
    mode?: 'vertical' | 'horizontal';
  }

  let { items, selected, depth = 0, mode = 'vertical' }: Props = $props();

</script>

{#snippet branch(list: MenuEntry[], level: number, listMode: 'vertical' | 'horizontal')}
  <ul class="lite-menu__list" data-mode={level === 0 ? listMode : 'vertical'} role={level === 0 ? 'menu' : 'group'}>
    {#each list as item (item.id)}
      <li role="none" class:active={selected === item.id} data-disabled={item.disabled || undefined}>
        {#if item.href && !item.disabled}
          <a role="menuitem" href={item.href} aria-current={selected === item.id ? 'page' : undefined}>
            <span>{item.label}</span>
            {#if item.badge !== undefined}<span class="lite-badge lite-badge-secondary">{item.badge}</span>{/if}
          </a>
        {:else}
          <span role="menuitem" aria-disabled={item.disabled || undefined}>
            <span>{item.label}</span>
            {#if item.badge !== undefined}<span class="lite-badge lite-badge-secondary">{item.badge}</span>{/if}
          </span>
        {/if}
        {#if item.children?.length}
          {@render branch(item.children, level + 1, 'vertical')}
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

{@render branch(items, depth, mode)}

<style>
  .lite-menu__list { margin: 0; padding: 4px; list-style: none; }
  .lite-menu__list[data-mode='horizontal'] { display: flex; flex-wrap: wrap; }
  .lite-menu__list li > a, .lite-menu__list li > span { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 4px; color: #1D2129; font-size: 13px; text-decoration: none; }
  .lite-menu__list li > a:hover, .lite-menu__list li.active > a { background: #E8F3FF; color: #165DFF; text-decoration: none; }
  .lite-menu__list li[data-disabled] > span { color: #C9CDD4; }
  .lite-menu__list li > a > span + span, .lite-menu__list li > span > span + span { margin-left: 8px; }
  .lite-menu__list .lite-menu__list { padding-left: 16px; }
</style>
