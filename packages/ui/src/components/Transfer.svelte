<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import type { Snippet } from 'svelte';
  import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Search } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { useTranslation } from '@svadmin/core/i18n';

  export interface TransferItem {
    key: string | number;
    title: string;
    description?: string;
    disabled?: boolean;
  }

  const i18n = useTranslation();

  interface Props {
    dataSource?: TransferItem[];
    targetKeys?: (string | number)[];
    titles?: [string, string];
    searchable?: boolean;
    disabled?: boolean;
    class?: string;
    onchange?: (
      nextTargetKeys: (string | number)[],
      direction: 'left' | 'right',
      moveKeys: (string | number)[]
    ) => void;
    renderItem?: Snippet<[{ item: TransferItem; direction: 'left' | 'right' }]>;
  }

  let {
    dataSource = [],
    targetKeys = $bindable([]),
    titles = ['源列表', '目标列表'],
    searchable = true,
    disabled = false,
    class: className,
    onchange,
    renderItem,
  }: Props = $props();

  let leftSearch = $state('');
  let rightSearch = $state('');

  const leftSelected = new SvelteSet<string | number>();
  const rightSelected = new SvelteSet<string | number>();

  const targetKeySet = $derived(new Set(targetKeys));

  const leftDataSource = $derived(
    dataSource.filter((item) => !targetKeySet.has(item.key))
  );

  const rightDataSource = $derived(
    dataSource.filter((item) => targetKeySet.has(item.key))
  );

  const filteredLeft = $derived(
    leftDataSource.filter((item) => {
      if (!leftSearch.trim()) return true;
      const q = leftSearch.toLowerCase();
      return item.title.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
    })
  );

  const filteredRight = $derived(
    rightDataSource.filter((item) => {
      if (!rightSearch.trim()) return true;
      const q = rightSearch.toLowerCase();
      return item.title.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
    })
  );

  function toggleLeftSelect(key: string | number) {
    if (leftSelected.has(key)) leftSelected.delete(key);
    else leftSelected.add(key);
  }

  function toggleRightSelect(key: string | number) {
    if (rightSelected.has(key)) rightSelected.delete(key);
    else rightSelected.add(key);
  }

  function toggleAllLeft() {
    const selectable = filteredLeft.filter((i) => !i.disabled);
    const allSelected = selectable.length > 0 && selectable.every((i) => leftSelected.has(i.key));
    if (allSelected) {
      for (const item of selectable) leftSelected.delete(item.key);
    } else {
      for (const item of selectable) leftSelected.add(item.key);
    }
  }

  function toggleAllRight() {
    const selectable = filteredRight.filter((i) => !i.disabled);
    const allSelected = selectable.length > 0 && selectable.every((i) => rightSelected.has(i.key));
    if (allSelected) {
      for (const item of selectable) rightSelected.delete(item.key);
    } else {
      for (const item of selectable) rightSelected.add(item.key);
    }
  }

  export function moveToRight() {
    if (disabled) return;
    const moveKeys = Array.from(leftSelected).filter((key) =>
      leftDataSource.some((item) => item.key === key && !item.disabled)
    );
    if (moveKeys.length === 0) return;

    const next = [...targetKeys, ...moveKeys];
    targetKeys = next;
    leftSelected.clear();
    onchange?.(next, 'right', moveKeys);
  }

  export function moveToLeft() {
    if (disabled) return;
    const moveKeys = Array.from(rightSelected).filter((key) =>
      rightDataSource.some((item) => item.key === key && !item.disabled)
    );
    if (moveKeys.length === 0) return;

    const moveKeySet = new Set(moveKeys);
    const next = targetKeys.filter((k) => !moveKeySet.has(k));
    targetKeys = next;
    rightSelected.clear();
    onchange?.(next, 'left', moveKeys);
  }

  export function moveAllToRight() {
    if (disabled) return;
    const moveKeys = leftDataSource.filter((i) => !i.disabled).map((i) => i.key);
    if (moveKeys.length === 0) return;
    const next = [...targetKeys, ...moveKeys];
    targetKeys = next;
    leftSelected.clear();
    onchange?.(next, 'right', moveKeys);
  }

  export function moveAllToLeft() {
    if (disabled) return;
    const moveKeys = rightDataSource.filter((i) => !i.disabled).map((i) => i.key);
    if (moveKeys.length === 0) return;
    const moveKeySet = new Set(moveKeys);
    const next = targetKeys.filter((k) => !moveKeySet.has(k));
    targetKeys = next;
    rightSelected.clear();
    onchange?.(next, 'left', moveKeys);
  }
</script>

<div class={cn('flex flex-col sm:flex-row items-center gap-3 w-full', className)} data-testid="transfer">
  <!-- Left Panel -->
  <div class="flex-1 w-full rounded-lg border border-border bg-card shadow-xs flex flex-col h-72">
    <div class="flex items-center justify-between border-b border-border/80 px-3 py-2 bg-muted/30">
      <div class="flex items-center gap-2">
        <Checkbox
          checked={filteredLeft.length > 0 && filteredLeft.filter((i) => !i.disabled).every((i) => leftSelected.has(i.key))}
          disabled={disabled || filteredLeft.filter((i) => !i.disabled).length === 0}
          onCheckedChange={toggleAllLeft}
        />
        <span class="text-xs font-medium text-foreground">{titles[0]}</span>
      </div>
      <span class="text-[11px] text-muted-foreground tabular-nums">
        {leftSelected.size} / {leftDataSource.length}
      </span>
    </div>

    {#if searchable}
      <div class="p-2 border-b border-border/40">
        <div class="relative">
          <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            bind:value={leftSearch}
            placeholder={i18n.t('common.search', undefined) ?? '搜索...'}
            class="h-8 pl-8 pr-2 text-xs"
            {disabled}
          />
        </div>
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto p-1 space-y-0.5">
      {#each filteredLeft as item (item.key)}
        {@const selected = leftSelected.has(item.key)}
        <div
          role="button"
          tabindex="0"
          class={cn(
            'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors cursor-pointer select-none',
            selected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-foreground',
            item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
          )}
          onclick={() => toggleLeftSelect(item.key)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleLeftSelect(item.key);
            }
          }}
        >
          <Checkbox
            checked={selected}
            disabled={disabled || item.disabled}
            onCheckedChange={() => toggleLeftSelect(item.key)}
          />
          <div class="min-w-0 flex-1">
            {#if renderItem}
              {@render renderItem({ item, direction: 'left' })}
            {:else}
              <div class="truncate">{item.title}</div>
              {#if item.description}
                <div class="truncate text-[10px] text-muted-foreground">{item.description}</div>
              {/if}
            {/if}
          </div>
        </div>
      {:else}
        <div class="py-10 text-center text-xs text-muted-foreground">
          {i18n.t('common.noData', undefined) ?? '无项目'}
        </div>
      {/each}
    </div>
  </div>

  <!-- Middle Action Buttons -->
  <div class="flex sm:flex-col gap-1.5 shrink-0 justify-center">
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      disabled={disabled || leftSelected.size === 0}
      onclick={moveToRight}
      title="转移所选项"
    >
      <ChevronRight class="h-4 w-4" />
    </Button>

    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      disabled={disabled || rightSelected.size === 0}
      onclick={moveToLeft}
      title="移除所选项"
    >
      <ChevronLeft class="h-4 w-4" />
    </Button>

    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled || leftDataSource.length === 0}
      onclick={moveAllToRight}
      title="全部转移"
    >
      <ChevronsRight class="h-4 w-4" />
    </Button>

    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled || rightDataSource.length === 0}
      onclick={moveAllToLeft}
      title="全部移除"
    >
      <ChevronsLeft class="h-4 w-4" />
    </Button>
  </div>

  <!-- Right Panel -->
  <div class="flex-1 w-full rounded-lg border border-border bg-card shadow-xs flex flex-col h-72">
    <div class="flex items-center justify-between border-b border-border/80 px-3 py-2 bg-muted/30">
      <div class="flex items-center gap-2">
        <Checkbox
          checked={filteredRight.length > 0 && filteredRight.filter((i) => !i.disabled).every((i) => rightSelected.has(i.key))}
          disabled={disabled || filteredRight.filter((i) => !i.disabled).length === 0}
          onCheckedChange={toggleAllRight}
        />
        <span class="text-xs font-medium text-foreground">{titles[1]}</span>
      </div>
      <span class="text-[11px] text-muted-foreground tabular-nums">
        {rightSelected.size} / {rightDataSource.length}
      </span>
    </div>

    {#if searchable}
      <div class="p-2 border-b border-border/40">
        <div class="relative">
          <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            bind:value={rightSearch}
            placeholder={i18n.t('common.search', undefined) ?? '搜索...'}
            class="h-8 pl-8 pr-2 text-xs"
            {disabled}
          />
        </div>
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto p-1 space-y-0.5">
      {#each filteredRight as item (item.key)}
        {@const selected = rightSelected.has(item.key)}
        <div
          role="button"
          tabindex="0"
          class={cn(
            'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors cursor-pointer select-none',
            selected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-foreground',
            item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
          )}
          onclick={() => toggleRightSelect(item.key)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleRightSelect(item.key);
            }
          }}
        >
          <Checkbox
            checked={selected}
            disabled={disabled || item.disabled}
            onCheckedChange={() => toggleRightSelect(item.key)}
          />
          <div class="min-w-0 flex-1">
            {#if renderItem}
              {@render renderItem({ item, direction: 'right' })}
            {:else}
              <div class="truncate">{item.title}</div>
              {#if item.description}
                <div class="truncate text-[10px] text-muted-foreground">{item.description}</div>
              {/if}
            {/if}
          </div>
        </div>
      {:else}
        <div class="py-10 text-center text-xs text-muted-foreground">
          {i18n.t('common.noData', undefined) ?? '无项目'}
        </div>
      {/each}
    </div>
  </div>
</div>
