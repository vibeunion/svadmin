<script lang="ts" generics="T">
  import { Ellipsis } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import * as DropdownMenu from './ui/dropdown-menu/index.js';
  import { cn } from '../utils.js';

  interface Props {
    items: T[];
    max?: number;
    moreLabel?: string;
    children: Snippet<[T, number]>;
    class?: string;
  }

  let {
    items,
    max = 3,
    moreLabel = 'More',
    children,
    class: className,
  }: Props = $props();

  const visible = $derived(items.slice(0, Math.max(0, max)));
  const hidden = $derived(items.slice(Math.max(0, max)));
</script>

<div class={cn('svadmin-overflow', className)}>
  {#each visible as item, index (index)}
    <div class="svadmin-overflow__item">{@render children(item, index)}</div>
  {/each}
  {#if hidden.length > 0}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger class="svadmin-overflow__trigger" aria-label={moreLabel}>
        <Ellipsis class="h-4 w-4" />
        <span class="svadmin-overflow__count">+{hidden.length}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="min-w-40">
        {#each hidden as item, index (max + index)}
          <DropdownMenu.Item class="p-0">
            <div class="w-full px-2 py-1.5">{@render children(item, max + index)}</div>
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
</div>
