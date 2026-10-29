<script lang="ts">
  import { Plus, X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import * as Tabs from './ui/tabs/index.js';

  export interface EditableTabItem {
    value: string;
    label: string;
    disabled?: boolean;
    closable?: boolean;
  }

  interface Props {
    items?: EditableTabItem[];
    value?: string;
    variant?: 'default' | 'line' | 'card';
    orientation?: 'horizontal' | 'vertical';
    scrollable?: boolean;
    addable?: boolean;
    addLabel?: string;
    maxItems?: number;
    panel?: Snippet<[string]>;
    extra?: Snippet;
    class?: string;
    onadd?: () => EditableTabItem | void;
    onremove?: (value: string) => void;
    onitemschange?: (items: EditableTabItem[]) => void;
  }

  let {
    items = $bindable([]),
    value = $bindable(''),
    variant = 'line',
    orientation = 'horizontal',
    scrollable = true,
    addable = true,
    addLabel = 'Add tab',
    maxItems = 20,
    panel,
    extra,
    class: className = '',
    onadd,
    onremove,
    onitemschange,
  }: Props = $props();

  let sequence = $state(0);

  function update(next: EditableTabItem[]) {
    items = next;
    onitemschange?.(next);
  }

  function add() {
    if (items.length >= maxItems) return;
    const created = onadd?.();
    if (created) {
      update([...items, created]);
      value = created.value;
      return;
    }
    let candidate = '';
    do {
      sequence += 1;
      candidate = `tab-${sequence}`;
    } while (items.some((item) => item.value === candidate));
    const next = { value: candidate, label: `Tab ${sequence}` };
    update([...items, next]);
    value = next.value;
  }

  function remove(item: EditableTabItem, index: number) {
    const next = items.filter((entry) => entry.value !== item.value);
    update(next);
    if (value === item.value) value = next[Math.max(0, index - 1)]?.value ?? next[0]?.value ?? '';
    onremove?.(item.value);
  }
</script>

<Tabs.Root bind:value class={className}>
  <div class="flex items-end gap-2">
    <Tabs.List
      {variant}
      {orientation}
      {scrollable}
      class={orientation === 'vertical' ? 'min-w-40' : ''}
    >
      {#each items as item (item.value)}
        <Tabs.Trigger value={item.value} disabled={item.disabled}>
          <span>{item.label}</span>
          {#if item.closable !== false && !item.disabled}
            <button
              type="button"
              class="svadmin-editable-tabs__close"
              aria-label={`Close ${item.label}`}
              onclick={(event) => {
                event.stopPropagation();
                remove(item, items.indexOf(item));
              }}
            >
              <X class="h-3 w-3" />
            </button>
          {/if}
        </Tabs.Trigger>
      {/each}
      {#if addable && items.length < maxItems}
        <button type="button" class="svadmin-editable-tabs__add" onclick={add}>
          <Plus class="h-3.5 w-3.5" />
          {addLabel}
        </button>
      {/if}
    </Tabs.List>
    {#if extra}
      <div class="svadmin-editable-tabs__extra">{@render extra()}</div>
    {/if}
  </div>
  {#each items as item (item.value)}
    <Tabs.Content value={item.value}>
      {@render panel?.(item.value)}
    </Tabs.Content>
  {/each}
</Tabs.Root>
