<script lang="ts">
  import { ChevronRight, ChevronDown, Check, Minus, Search, X } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface VirtualTreeNode {
    value: string | number;
    label: string;
    children?: VirtualTreeNode[] | undefined;
    disabled?: boolean | undefined;
    [key: string]: unknown;
  }

  export interface VirtualTreeSelectProps {
    /** Hierarchical tree nodes */
    options?: VirtualTreeNode[] | undefined;
    /** Bound value: single value or array of values for multiple */
    value?: string | number | (string | number)[] | undefined;
    /** Multiple selection mode */
    multiple?: boolean | undefined;
    /** Placeholder when no value is selected */
    placeholder?: string | undefined;
    /** Disabled state */
    disabled?: boolean | undefined;
    /** Height of the virtual list viewport in pixels (default: 260) */
    height?: number | undefined;
    /** Fixed item height in pixels for virtual row slicing (default: 32) */
    itemHeight?: number | undefined;
    /** Enable search filter */
    searchable?: boolean | undefined;
    /** Cascade selection: selecting parent selects all children (default: true for multiple) */
    cascade?: boolean | undefined;
    /** Extra classes */
    class?: string | undefined;
    /** Change event callback */
    onchange?: ((val: string | number | (string | number)[]) => void) | undefined;
  }

  let {
    options = [],
    value = $bindable(undefined),
    multiple = false,
    placeholder = 'Please select…',
    disabled = false,
    height = 260,
    itemHeight = 32,
    searchable = true,
    cascade = true,
    class: className = '',
    onchange,
  }: VirtualTreeSelectProps = $props();

  let isOpen = $state(false);
  let searchQuery = $state('');
  let expandedKeys = $state<Set<string | number>>(new Set());
  let containerEl = $state<HTMLDivElement | null>(null);
  let scrollTop = $state(0);

  // 内部规范化选中值集合
  const selectedSet = $derived.by<Set<string | number>>(() => {
    if (value === undefined || value === null) return new Set();
    if (Array.isArray(value)) return new Set(value);
    return new Set([value]);
  });

  // 判断是否为叶子节点
  function isLeaf(node: VirtualTreeNode): boolean {
    return !node.children || node.children.length === 0;
  }

  // 展开 / 折叠切换
  function toggleExpand(key: string | number, e: MouseEvent) {
    e.stopPropagation();
    const next = new Set(expandedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    expandedKeys = next;
  }

  // 节点查找映射表
  const nodeMap = $derived.by<Map<string | number, VirtualTreeNode>>(() => {
    const map = new Map<string | number, VirtualTreeNode>();
    function traverse(list: VirtualTreeNode[]) {
      for (const n of list) {
        map.set(n.value, n);
        if (n.children) traverse(n.children);
      }
    }
    traverse(options);
    return map;
  });

  // 获取某个节点的所有叶子子孙节点
  function getAllDescendantValues(node: VirtualTreeNode): (string | number)[] {
    const res: (string | number)[] = [];
    function walk(curr: VirtualTreeNode) {
      if (isLeaf(curr)) {
        res.push(curr.value);
      } else if (curr.children) {
        for (const c of curr.children) walk(c);
      }
    }
    walk(node);
    return res;
  }

  // 检查节点的选中/半选状态 (仅用于多选 + cascade)
  function getNodeCheckState(node: VirtualTreeNode): 'checked' | 'indeterminate' | 'unchecked' {
    if (isLeaf(node)) {
      return selectedSet.has(node.value) ? 'checked' : 'unchecked';
    }
    const descendants = getAllDescendantValues(node);
    if (descendants.length === 0) {
      return selectedSet.has(node.value) ? 'checked' : 'unchecked';
    }
    let checkedCount = 0;
    for (const d of descendants) {
      if (selectedSet.has(d)) checkedCount++;
    }
    if (checkedCount === descendants.length) return 'checked';
    if (checkedCount > 0) return 'indeterminate';
    return 'unchecked';
  }

  // 处理节点选中操作
  function handleSelectNode(node: VirtualTreeNode) {
    if (node.disabled) return;

    if (!multiple) {
      value = node.value;
      onchange?.(node.value);
      isOpen = false;
      return;
    }

    // 多选模式
    const next = new Set(selectedSet);
    if (cascade && !isLeaf(node)) {
      const descendants = getAllDescendantValues(node);
      const isCurrentlyAll = descendants.every((val) => next.has(val));
      if (isCurrentlyAll) {
        for (const v of descendants) next.delete(v);
        next.delete(node.value);
      } else {
        for (const v of descendants) next.add(v);
        next.add(node.value);
      }
    } else {
      if (next.has(node.value)) {
        next.delete(node.value);
      } else {
        next.add(node.value);
      }
    }

    const arr = Array.from(next);
    value = arr;
    onchange?.(arr);
  }

  // 搜索过滤与祖先自动展开
  interface FlatRow {
    node: VirtualTreeNode;
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
  }

  const flattenedRows = $derived.by<FlatRow[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows: FlatRow[] = [];

    // 若有搜索关键词，先找出命中节点及其所有上级祖先的 keys
    const matchExpanded = new Set<string | number>();
    const matchedKeys = new Set<string | number>();
    if (q) {
      function findMatches(list: VirtualTreeNode[], ancestors: (string | number)[]) {
        for (const n of list) {
          const match = n.label.toLowerCase().includes(q);
          if (match) {
            matchedKeys.add(n.value);
            for (const a of ancestors) matchExpanded.add(a);
          }
          if (n.children) {
            findMatches(n.children, [...ancestors, n.value]);
          }
        }
      }
      findMatches(options, []);
    }

    function walk(list: VirtualTreeNode[], depth: number) {
      for (const n of list) {
        const hasChildren = Boolean(n.children && n.children.length > 0);
        const isExp = q ? matchExpanded.has(n.value) || expandedKeys.has(n.value) : expandedKeys.has(n.value);

        // 如果在搜索模式，只有自身匹配或子孙匹配才展示
        const shouldShow = !q || matchedKeys.has(n.value) || matchExpanded.has(n.value);
        if (shouldShow) {
          rows.push({
            node: n,
            depth,
            hasChildren,
            expanded: isExp,
          });
        }

        if (hasChildren && n.children && (isExp || (q && matchExpanded.has(n.value)))) {
          walk(n.children, depth + 1);
        }
      }
    }

    walk(options, 0);
    return rows;
  });

  // 虚拟滚动计算切片
  const totalCount = $derived(flattenedRows.length);
  const totalHeight = $derived(totalCount * itemHeight);
  const buffer = 4;
  const visibleCount = $derived(Math.ceil(height / itemHeight));

  const startIndex = $derived(Math.max(0, Math.floor(scrollTop / itemHeight) - buffer));
  const endIndex = $derived(Math.min(totalCount, startIndex + visibleCount + buffer * 2));
  const visibleRows = $derived(flattenedRows.slice(startIndex, endIndex));
  const offsetY = $derived(startIndex * itemHeight);

  function handleScroll(e: Event) {
    const target = e.currentTarget as HTMLElement;
    scrollTop = target.scrollTop;
  }

  // 标签回显文本
  const displayLabels = $derived.by<string[]>(() => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((v) => nodeMap.get(v)?.label ?? String(v));
    }
    const single = nodeMap.get(value);
    return single ? [single.label] : [String(value)];
  });

  function removeSingleTag(val: string | number, e: MouseEvent) {
    e.stopPropagation();
    if (!multiple) {
      value = undefined;
      onchange?.(undefined as unknown as string);
      return;
    }
    const next = new Set(selectedSet);
    next.delete(val);
    const arr = Array.from(next);
    value = arr;
    onchange?.(arr);
  }

  function handleClear(e: MouseEvent) {
    e.stopPropagation();
    value = multiple ? [] : undefined;
    onchange?.(multiple ? [] : (undefined as unknown as string));
  }

  // 点击外部收起
  function handleClickOutside(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) {
      isOpen = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div
  bind:this={containerEl}
  data-svadmin-component="VirtualTreeSelect"
  class={cn('relative w-full text-xs font-sans', className)}
>
  <!-- Input trigger box -->
  <button
    type="button"
    {disabled}
    onclick={() => { if (!disabled) isOpen = !isOpen; }}
    class={cn(
      'flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs transition-colors',
      'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
      'hover:border-accent disabled:cursor-not-allowed disabled:opacity-50 text-left'
    )}
  >
    <div class="flex flex-wrap items-center gap-1 overflow-hidden pr-2 flex-1">
      {#if displayLabels.length === 0}
        <span class="text-muted-foreground select-none">{placeholder}</span>
      {:else if !multiple}
        <span class="text-foreground truncate font-medium">{displayLabels[0]}</span>
      {:else}
        {#each displayLabels as tag, idx (idx)}
          {@const tagVal = Array.isArray(value) ? value[idx] : undefined}
          <span class="inline-flex items-center gap-1 rounded bg-secondary/80 text-secondary-foreground px-1.5 py-0.5 text-xs font-medium border border-border/40">
            <span class="truncate max-w-[120px]">{tag}</span>
            {#if !disabled && tagVal !== undefined}
              <span
                role="button"
                tabindex="-1"
                class="hover:text-destructive cursor-pointer"
                onclick={(e) => removeSingleTag(tagVal, e)}
                onkeydown={(e) => { if (e.key === 'Enter') removeSingleTag(tagVal, e as unknown as MouseEvent); }}
              >
                <X class="h-3 w-3" />
              </span>
            {/if}
          </span>
        {/each}
      {/if}
    </div>

    <div class="flex items-center gap-1 text-muted-foreground shrink-0">
      {#if displayLabels.length > 0 && !disabled}
        <span
          role="button"
          tabindex="-1"
          aria-label="Clear selection"
          class="hover:text-foreground cursor-pointer p-0.5"
          onclick={handleClear}
          onkeydown={(e) => { if (e.key === 'Enter') handleClear(e as unknown as MouseEvent); }}
        >
          <X class="h-3.5 w-3.5" />
        </span>
      {/if}
      <ChevronDown class={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />
    </div>
  </button>

  <!-- Dropdown popover with virtual list -->
  {#if isOpen}
    <div
      class="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95"
    >
      {#if searchable}
        <div class="p-2 border-b border-border/60 bg-muted/20">
          <div class="relative flex items-center">
            <Search class="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search nodes…"
              class="w-full rounded-sm border border-input bg-background pl-8 pr-2.5 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      {/if}

      <!-- Virtual Scrolling Viewport -->
      <div
        class="overflow-y-auto overscroll-contain"
        style="height: {height}px;"
        onscroll={handleScroll}
      >
        {#if flattenedRows.length === 0}
          <div class="py-8 text-center text-muted-foreground text-xs select-none">
            No matching nodes
          </div>
        {:else}
          <div class="relative w-full" style="height: {totalHeight}px;">
            <div
              class="absolute left-0 top-0 w-full"
              style="transform: translateY({offsetY}px);"
            >
              {#each visibleRows as row (row.node.value)}
                {@const checkState = getNodeCheckState(row.node)}
                {@const isSelected = selectedSet.has(row.node.value)}
                <div
                  role="button"
                  tabindex="0"
                  style="height: {itemHeight}px; padding-left: {row.depth * 18 + 8}px;"
                  class={cn(
                    'flex items-center gap-1.5 px-2 text-xs transition-colors cursor-pointer select-none',
                    'hover:bg-accent hover:text-accent-foreground',
                    isSelected && !multiple && 'bg-primary/10 font-medium text-primary',
                    row.node.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                  )}
                  onclick={() => handleSelectNode(row.node)}
                  onkeydown={(e) => { if (e.key === 'Enter') handleSelectNode(row.node); }}
                >
                  <!-- Expand/collapse toggle -->
                  {#if row.hasChildren}
                    <button
                      type="button"
                      class="flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                      onclick={(e) => toggleExpand(row.node.value, e)}
                    >
                      <ChevronRight class={cn('h-3.5 w-3.5 transition-transform', row.expanded && 'rotate-90')} />
                    </button>
                  {:else}
                    <span class="w-4"></span>
                  {/if}

                  <!-- Checkbox for multiple selection -->
                  {#if multiple}
                    <span
                      class={cn(
                        'flex h-3.5 w-3.5 items-center justify-center rounded-xs border transition-colors',
                        checkState === 'checked' && 'border-primary bg-primary text-primary-foreground',
                        checkState === 'indeterminate' && 'border-primary bg-primary text-primary-foreground',
                        checkState === 'unchecked' && 'border-muted-foreground/50 bg-background'
                      )}
                    >
                      {#if checkState === 'checked'}
                        <Check class="h-2.5 w-2.5 stroke-[3]" />
                      {:else if checkState === 'indeterminate'}
                        <Minus class="h-2.5 w-2.5 stroke-[3]" />
                      {/if}
                    </span>
                  {/if}

                  <!-- Node label -->
                  <span class="truncate flex-1">{row.node.label}</span>

                  {#if !multiple && isSelected}
                    <Check class="h-3.5 w-3.5 text-primary shrink-0 mr-1" />
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
