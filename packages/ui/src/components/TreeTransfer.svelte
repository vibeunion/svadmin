<script lang="ts">
  import { Search, ChevronRight, ChevronDown, X, ArrowRight } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';

  export interface TreeTransferNode {
    key: string;
    title: string;
    disabled?: boolean;
    children?: TreeTransferNode[];
  }

  export interface TreeTransferProps {
    /** Hierarchical tree data source */
    dataSource: TreeTransferNode[];
    /** Keys of selected items in the right transfer panel */
    targetKeys?: string[];
    /** Titles of left and right panels */
    titles?: [string, string];
    /** Whether search inputs are shown */
    searchable?: boolean;
    /** Whether the entire transfer component is disabled */
    disabled?: boolean;
    /** Additional CSS classes */
    class?: string;
    /** Callback when target keys change */
    onchange?: (nextTargetKeys: string[]) => void;
  }

  let {
    dataSource = [],
    targetKeys = $bindable([]),
    titles,
    searchable = true,
    disabled = false,
    class: className = '',
    onchange,
  }: TreeTransferProps = $props();

  const i18n = useTranslation();
  const defaultTitles = $derived<[string, string]>([
    titles?.[0] ?? i18n.t('org.source'),
    titles?.[1] ?? i18n.t('org.target'),
  ]);

  let leftSearch = $state('');
  let rightSearch = $state('');
  let expandedKeys = $state<Record<string, boolean>>({});

  function toggleExpand(key: string, e?: MouseEvent) {
    e?.stopPropagation();
    expandedKeys[key] = !expandedKeys[key];
  }

  function getAllLeaves(nodes: TreeTransferNode[]): TreeTransferNode[] {
    const leaves: TreeTransferNode[] = [];
    function traverse(list: TreeTransferNode[]) {
      for (const node of list) {
        if (!node.children || node.children.length === 0) {
          leaves.push(node);
        } else {
          traverse(node.children);
        }
      }
    }
    traverse(nodes);
    return leaves;
  }

  const allLeaves = $derived(getAllLeaves(dataSource));
  const leafMap = $derived(new Map(allLeaves.map((l) => [l.key, l])));

  function isNodeSelected(node: TreeTransferNode): boolean {
    if (!node.children || node.children.length === 0) {
      return targetKeys.includes(node.key);
    }
    const nodeLeaves = getAllLeaves([node]);
    return nodeLeaves.length > 0 && nodeLeaves.every((l) => targetKeys.includes(l.key));
  }

  function isNodeIndeterminate(node: TreeTransferNode): boolean {
    if (!node.children || node.children.length === 0) return false;
    const nodeLeaves = getAllLeaves([node]);
    const selectedCount = nodeLeaves.filter((l) => targetKeys.includes(l.key)).length;
    return selectedCount > 0 && selectedCount < nodeLeaves.length;
  }

  function toggleSelect(node: TreeTransferNode) {
    if (disabled || node.disabled) return;
    const nodeLeaves = getAllLeaves([node]);
    const leafKeys = nodeLeaves.map((l) => l.key);
    const allSelected = isNodeSelected(node);

    let next: string[];
    if (allSelected) {
      next = targetKeys.filter((k) => !leafKeys.includes(k));
    } else {
      next = Array.from(new Set([...targetKeys, ...leafKeys]));
    }
    targetKeys = next;
    onchange?.(next);
  }

  function removeItem(key: string) {
    if (disabled) return;
    const next = targetKeys.filter((k) => k !== key);
    targetKeys = next;
    onchange?.(next);
  }

  function clearAll() {
    if (disabled) return;
    targetKeys = [];
    onchange?.([]);
  }

  const selectedItems = $derived(
    targetKeys
      .map((k) => leafMap.get(k))
      .filter((item): item is TreeTransferNode => item !== undefined)
      .filter((item) => (rightSearch.trim() ? item.title.toLowerCase().includes(rightSearch.toLowerCase()) : true)),
  );
</script>

<div
  data-svadmin-component="TreeTransfer"
  class={cn(
    'flex flex-col sm:flex-row items-stretch gap-4 p-4 rounded-xl border border-border bg-card text-card-foreground',
    disabled && 'opacity-60 pointer-events-none',
    className,
  )}
>
  <!-- 左侧树状面板 -->
  <div class="flex-1 flex flex-col rounded-lg border border-border bg-background overflow-hidden min-h-[320px]">
    <div class="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
      <span>{defaultTitles[0]}</span>
      <span>{allLeaves.length} 项</span>
    </div>

    {#if searchable}
      <div class="p-2 border-b border-border/50 bg-muted/20">
        <div class="relative flex items-center">
          <Search size={14} class="absolute left-2.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            bind:value={leftSearch}
            placeholder={i18n.t('org.search')}
            class="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      {#snippet renderTreeNode(node: TreeTransferNode, level = 0)}
        {@const hasChildren = node.children && node.children.length > 0}
        {@const expanded = expandedKeys[node.key] ?? true}
        {@const selected = isNodeSelected(node)}
        {@const indeterminate = isNodeIndeterminate(node)}
        {@const matchesSearch = !leftSearch.trim() || node.title.toLowerCase().includes(leftSearch.toLowerCase())}

        {#if matchesSearch || hasChildren}
          <div class="select-none">
            <div
              class={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted/60 cursor-pointer transition-colors',
                selected && 'bg-primary/10 text-primary font-medium',
              )}
              style={`padding-left: ${level * 16 + 8}px`}
              onclick={() => toggleSelect(node)}
              role="checkbox"
              aria-checked={indeterminate ? 'mixed' : selected}
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && toggleSelect(node)}
            >
              {#if hasChildren}
                <button
                  type="button"
                  class="p-0.5 rounded text-muted-foreground hover:text-foreground"
                  onclick={(e) => toggleExpand(node.key, e)}
                  aria-label="Toggle node"
                >
                  {#if expanded}
                    <ChevronDown size={14} />
                  {:else}
                    <ChevronRight size={14} />
                  {/if}
                </button>
              {:else}
                <span class="w-4.5 inline-block"></span>
              {/if}

              <input
                type="checkbox"
                checked={selected}
                indeterminate={indeterminate}
                disabled={node.disabled}
                class="rounded border-input text-primary focus:ring-ring h-3.5 w-3.5 pointer-events-none"
              />
              <span class="truncate">{node.title}</span>
            </div>

            {#if hasChildren && expanded && node.children}
              <div class="mt-0.5">
                {#each node.children as child (child.key)}
                  {@render renderTreeNode(child, level + 1)}
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/snippet}

      {#each dataSource as rootNode (rootNode.key)}
        {@render renderTreeNode(rootNode)}
      {/each}

      {#if dataSource.length === 0}
        <div class="py-8 text-center text-xs text-muted-foreground">{i18n.t('org.empty')}</div>
      {/if}
    </div>
  </div>

  <!-- 中间穿梭指示器 -->
  <div class="flex sm:flex-col items-center justify-center gap-2 text-muted-foreground self-center">
    <div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border shadow-2xs">
      <ArrowRight size={14} class="rotate-90 sm:rotate-0" />
    </div>
  </div>

  <!-- 右侧已选列表面板 -->
  <div class="flex-1 flex flex-col rounded-lg border border-border bg-background overflow-hidden min-h-[320px]">
    <div class="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
      <span>{defaultTitles[1]}</span>
      <div class="flex items-center gap-2">
        <span>已选 {targetKeys.length} 项</span>
        {#if targetKeys.length > 0}
          <button
            type="button"
            class="text-destructive hover:underline text-[11px] font-normal"
            onclick={clearAll}
          >
            {i18n.t('org.clearAll')}
          </button>
        {/if}
      </div>
    </div>

    {#if searchable}
      <div class="p-2 border-b border-border/50 bg-muted/20">
        <div class="relative flex items-center">
          <Search size={14} class="absolute left-2.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            bind:value={rightSearch}
            placeholder={i18n.t('org.search')}
            class="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      {#each selectedItems as item (item.key)}
        <div class="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs bg-muted/30 hover:bg-muted/60 transition-colors group">
          <span class="truncate font-medium text-foreground">{item.title}</span>
          <button
            type="button"
            class="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
            onclick={() => removeItem(item.key)}
            aria-label={`Remove ${item.title}`}
          >
            <X size={13} />
          </button>
        </div>
      {/each}

      {#if targetKeys.length === 0}
        <div class="py-12 text-center text-xs text-muted-foreground">{i18n.t('org.empty')}</div>
      {/if}
    </div>
  </div>
</div>
