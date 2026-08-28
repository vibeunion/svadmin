<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { ChevronRight, ChevronDown, Check, X, Search, ChevronsUpDown } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import * as Popover from './ui/popover/index.js';
  import { Input } from './ui/input/index.js';
  import { Badge } from './ui/badge/index.js';
  import { useTranslation } from '@svadmin/core/i18n';

  export interface TreeSelectOption {
    value: string | number;
    label: string;
    children?: TreeSelectOption[];
    disabled?: boolean;
    expanded?: boolean;
  }

  const i18n = useTranslation();

  interface Props {
    options?: TreeSelectOption[];
    value?: string | number | (string | number)[];
    multiple?: boolean;
    placeholder?: string;
    searchable?: boolean;
    onlyLeafSelectable?: boolean;
    disabled?: boolean;
    allowClear?: boolean;
    class?: string;
    onchange?: (value: string | number | (string | number)[] | undefined) => void;
  }

  let {
    options = [],
    value = $bindable(undefined),
    multiple = false,
    placeholder,
    searchable = true,
    onlyLeafSelectable = false,
    disabled = false,
    allowClear = true,
    class: className,
    onchange,
  }: Props = $props();

  let open = $state(false);
  let searchQuery = $state('');
  let expandedNodes = new SvelteSet<string | number>();

  // Map to quickly look up option info by value
  const optionMap = $derived.by(() => {
    const map = new Map<string | number, TreeSelectOption>();
    function traverse(nodes: TreeSelectOption[]) {
      for (const node of nodes) {
        map.set(node.value, node);
        if (node.children) traverse(node.children);
      }
    }
    traverse(options);
    return map;
  });

  // Selected values array normalized
  const selectedValues = $derived.by< (string | number)[]>(() => {
    if (value === undefined || value === null || value === '') return [];
    return Array.isArray(value) ? value : [value];
  });

  const selectedLabels = $derived.by(() => {
    return selectedValues.map((v) => optionMap.get(v)?.label ?? String(v));
  });

  function toggleExpand(nodeValue: string | number, event?: MouseEvent) {
    event?.stopPropagation();
    if (expandedNodes.has(nodeValue)) {
      expandedNodes.delete(nodeValue);
    } else {
      expandedNodes.add(nodeValue);
    }
  }

  function isNodeExpanded(node: TreeSelectOption): boolean {
    if (searchQuery.trim()) return true; // Auto expand all on search
    return expandedNodes.has(node.value) || !!node.expanded;
  }

  function isSelected(val: string | number): boolean {
    return selectedValues.includes(val);
  }

  function handleSelect(node: TreeSelectOption) {
    if (node.disabled) return;
    const hasChildren = node.children && node.children.length > 0;
    if (onlyLeafSelectable && hasChildren) {
      toggleExpand(node.value);
      return;
    }

    if (multiple) {
      let next: (string | number)[];
      if (isSelected(node.value)) {
        next = selectedValues.filter((v) => v !== node.value);
      } else {
        next = [...selectedValues, node.value];
      }
      value = next;
      onchange?.(next);
    } else {
      const next = node.value;
      value = next;
      onchange?.(next);
      open = false;
    }
  }

  function clearAll(event?: MouseEvent) {
    event?.stopPropagation();
    const next = multiple ? [] : undefined;
    value = next;
    onchange?.(next);
  }

  function removeSingle(val: string | number, event?: MouseEvent) {
    event?.stopPropagation();
    if (multiple) {
      const next = selectedValues.filter((v) => v !== val);
      value = next;
      onchange?.(next);
    }
  }

  function filterTree(nodes: TreeSelectOption[], query: string): TreeSelectOption[] {
    const q = query.trim().toLowerCase();
    if (!q) return nodes;

    const filtered: TreeSelectOption[] = [];
    for (const node of nodes) {
      const matchSelf = node.label.toLowerCase().includes(q);
      const filteredChildren = node.children ? filterTree(node.children, q) : undefined;
      const matchChildren = filteredChildren && filteredChildren.length > 0;

      if (matchSelf || matchChildren) {
        filtered.push({
          ...node,
          children: filteredChildren ?? node.children,
        });
      }
    }
    return filtered;
  }

  const visibleOptions = $derived(filterTree(options, searchQuery));
</script>

{#snippet treeNode(node: TreeSelectOption, level: number)}
  {@const hasChildren = Boolean(node.children && node.children.length > 0)}
  {@const expanded = isNodeExpanded(node)}
  {@const selected = isSelected(node.value)}
  {@const selectable = !node.disabled && (!onlyLeafSelectable || !hasChildren)}

  <div class="flex flex-col">
    <div
      role="treeitem"
      tabindex="0"
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      class={cn(
        'group flex items-center justify-between gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors cursor-pointer select-none',
        selected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/60 text-foreground',
        node.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
      style="padding-left: {level * 16 + 8}px;"
      onclick={() => {
        if (selectable) handleSelect(node);
      }}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (selectable) handleSelect(node);
        }
      }}
    >
      <div class="flex min-w-0 items-center gap-1.5">
        {#if hasChildren}
          <button
            type="button"
            class="flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
            onclick={(e) => toggleExpand(node.value, e)}
          >
            {#if expanded}
              <ChevronDown class="h-3.5 w-3.5" />
            {:else}
              <ChevronRight class="h-3.5 w-3.5" />
            {/if}
          </button>
        {:else}
          <span class="inline-block h-4 w-4 shrink-0"></span>
        {/if}

        <span class="truncate">{node.label}</span>
      </div>

      {#if selected}
        <Check class="h-3.5 w-3.5 shrink-0 text-primary" />
      {/if}
    </div>

    {#if hasChildren && expanded && node.children}
      <div role="group" class="flex flex-col">
        {#each node.children as child (child.value)}
          {@render treeNode(child, level + 1)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<div class={cn('relative w-full', className)} data-testid="tree-select">
  <Popover.Root bind:open>
    <Popover.Trigger class="w-full">
      {#snippet child({ props })}
        <button
          type="button"
          {...props}
          {disabled}
          class={cn(
            'flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left',
            open && 'ring-2 ring-ring ring-offset-2'
          )}
        >
          <div class="flex flex-wrap items-center gap-1 min-w-0 flex-1">
            {#if selectedValues.length === 0}
              <span class="text-muted-foreground">
                {placeholder ?? (i18n.t('field.selectPlaceholder', undefined) ?? '请选择...')}
              </span>
            {:else if multiple}
              {#each selectedValues as val (val)}
                {@const opt = optionMap.get(val)}
                <Badge variant="secondary" class="h-5 px-1.5 py-0 text-[11px] gap-1 shrink-0">
                  <span>{opt?.label ?? val}</span>
                  {#if !disabled}
                    <span
                      role="button"
                      tabindex="0"
                      class="hover:text-destructive cursor-pointer"
                      onclick={(e) => removeSingle(val, e)}
                      onkeydown={(e) => {
                        if (e.key === 'Enter') removeSingle(val, e as never);
                      }}
                    >
                      <X class="h-3 w-3" />
                    </span>
                  {/if}
                </Badge>
              {/each}
            {:else}
              <span class="truncate text-foreground font-normal">
                {selectedLabels[0] ?? ''}
              </span>
            {/if}
          </div>

          <div class="flex items-center gap-1 shrink-0 ml-1 text-muted-foreground">
            {#if allowClear && selectedValues.length > 0 && !disabled}
              <span
                role="button"
                tabindex="0"
                class="hover:text-foreground cursor-pointer p-0.5"
                onclick={clearAll}
                onkeydown={(e) => {
                  if (e.key === 'Enter') clearAll(e as never);
                }}
              >
                <X class="h-3.5 w-3.5" />
              </span>
            {/if}
            <ChevronsUpDown class="h-3.5 w-3.5 opacity-50" />
          </div>
        </button>
      {/snippet}
    </Popover.Trigger>

    <Popover.Content class="w-(--bits-popover-anchor-width) min-w-[220px] max-w-[400px] p-2" align="start">
      {#if searchable}
        <div class="relative mb-2">
          <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            bind:value={searchQuery}
            placeholder={i18n.t('common.search', undefined) ?? '搜索...'}
            class="h-8 pl-8 pr-2 text-xs"
          />
        </div>
      {/if}

      <div role="tree" class="max-h-60 overflow-y-auto space-y-0.5 pr-1">
        {#each visibleOptions as rootNode (rootNode.value)}
          {@render treeNode(rootNode, 0)}
        {:else}
          <div class="py-6 text-center text-xs text-muted-foreground">
            {i18n.t('common.noData', undefined) ?? '无匹配选项'}
          </div>
        {/each}
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
