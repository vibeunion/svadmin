<script lang="ts">
  import LiteMenuList, { type MenuEntry } from './LiteMenuList.svelte';

  interface Props {
    items: MenuEntry[];
    mode?: 'vertical' | 'horizontal';
    selected?: string;
    label?: string;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let { items, mode = 'vertical', selected, label = 'Menu', class: className = '' }: Props = $props();
</script>

<nav class="lite-menu {className}" data-mode={mode} aria-label={label}>
  <LiteMenuList {items} {selected} {mode} />
</nav>

<style>
  .lite-menu { border: 1px solid #E5E6EB; border-radius: 8px; background: #fff; }
</style>
