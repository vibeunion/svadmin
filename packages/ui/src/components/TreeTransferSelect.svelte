<script lang="ts">
  import {
    Network,
    Search,
    ChevronRight,
    ChevronDown,
    ArrowRight,
    ArrowLeft,
    X,
    Users,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { Checkbox } from './ui/checkbox/index.js';

  export interface TreeTransferSelectNode {
    id: string;
    label: string;
    disabled?: boolean | undefined;
    isLeaf?: boolean | undefined;
    children?: TreeTransferSelectNode[] | undefined;
  }

  export interface TreeTransferSelectProps {
    treeData: TreeTransferSelectNode[];
    targetKeys?: string[] | undefined;
    sourceTitle?: string | undefined;
    targetTitle?: string | undefined;
    class?: string | undefined;
    onChange?: ((targetKeys: string[], targetNodes: TreeTransferSelectNode[]) => void) | undefined;
  }

  let {
    treeData = [],
    targetKeys = $bindable([]),
    sourceTitle,
    targetTitle,
    class: className = '',
    onChange,
  }: TreeTransferSelectProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let sourceSearch = $state('');
  let targetSearch = $state('');
  let collapsedNodes = $state(new Set<string>());
  let selectedSourceKeys = $state(new Set<string>());
  let selectedTargetKeys = $state(new Set<string>());

  function getAllLeafNodes(nodes: TreeTransferSelectNode[]): TreeTransferSelectNode[] {
    const leaves: TreeTransferSelectNode[] = [];
    function walk(list: TreeTransferSelectNode[]) {
      for (const n of list) {
        if (!n.children || n.children.length === 0 || n.isLeaf) {
          leaves.push(n);
        } else {
          walk(n.children);
        }
      }
    }
    walk(nodes);
    return leaves;
  }

  const allLeaves = $derived(getAllLeafNodes(treeData));
  const targetKeySet = $derived(new Set(targetKeys));

  const targetNodes = $derived(
    allLeaves.filter((leaf) => targetKeySet.has(leaf.id)),
  );

  function toggleCollapse(id: string) {
    const next = new Set(collapsedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    collapsedNodes = next;
  }

  function getBranchLeaves(node: TreeTransferSelectNode): TreeTransferSelectNode[] {
    return getAllLeafNodes([node]);
  }

  function isNodeChecked(node: TreeTransferSelectNode): boolean {
    const leaves = getBranchLeaves(node);
    if (leaves.length === 0) return selectedSourceKeys.has(node.id);
    return leaves.every((l) => selectedSourceKeys.has(l.id));
  }

  function isNodeIndeterminate(node: TreeTransferSelectNode): boolean {
    const leaves = getBranchLeaves(node);
    if (leaves.length <= 1) return false;
    const checkedCount = leaves.filter((l) => selectedSourceKeys.has(l.id)).length;
    return checkedCount > 0 && checkedCount < leaves.length;
  }

  function toggleNodeCheck(node: TreeTransferSelectNode) {
    const next = new Set(selectedSourceKeys);
    const leaves = getBranchLeaves(node);
    const checked = isNodeChecked(node);

    leaves.forEach((l) => {
      if (checked) next.delete(l.id);
      else next.add(l.id);
    });
    selectedSourceKeys = next;
  }

  function moveToTarget() {
    const nextTargetKeys = Array.from(new Set([...targetKeys, ...Array.from(selectedSourceKeys)]));
    targetKeys = nextTargetKeys;
    selectedSourceKeys = new Set();
    const targets = allLeaves.filter((l) => nextTargetKeys.includes(l.id));
    onChange?.(nextTargetKeys, targets);
  }

  function removeFromTarget() {
    const nextTargetKeys = targetKeys.filter((k) => !selectedTargetKeys.has(k));
    targetKeys = nextTargetKeys;
    selectedTargetKeys = new Set();
    const targets = allLeaves.filter((l) => nextTargetKeys.includes(l.id));
    onChange?.(nextTargetKeys, targets);
  }

  function removeSingleTarget(id: string) {
    const nextTargetKeys = targetKeys.filter((k) => k !== id);
    targetKeys = nextTargetKeys;
    const targets = allLeaves.filter((l) => nextTargetKeys.includes(l.id));
    onChange?.(nextTargetKeys, targets);
  }

  function clearAllTargets() {
    targetKeys = [];
    selectedTargetKeys = new Set();
    onChange?.([], []);
  }

  const resolvedSourceTitle = $derived(sourceTitle ?? (chinese ? '组织架构树' : 'Source Hierarchy'));
  const resolvedTargetTitle = $derived(targetTitle ?? (chinese ? '已指派人员/节点' : 'Assigned Items'));
</script>

<div
  data-svadmin-component="TreeTransferSelect"
  class={cn(
    'grid grid-cols-1 md:grid-cols-[1fr_52px_1fr] gap-3 rounded-md border border-border bg-card text-card-foreground p-5 shadow-xs items-center text-xs',
    className,
  )}
>
  <!-- Left Panel: Tree Selector -->
  <div class="flex flex-col h-80 rounded-md border border-border bg-background overflow-hidden">
    <!-- Panel Header -->
    <div class="flex items-center justify-between border-b border-border/70 px-4 py-2.5 bg-muted/30">
      <div class="flex items-center gap-1.5 font-semibold text-foreground">
        <Network class="h-3.5 w-3.5 text-primary" />
        <span>{resolvedSourceTitle}</span>
      </div>
      <span class="text-[11px] font-mono text-muted-foreground">
        {allLeaves.length} {chinese ? '项' : 'nodes'}
      </span>
    </div>

    <!-- Search bar -->
    <div class="px-3 py-2 border-b border-border/50 bg-background">
      <div class="relative flex items-center">
        <Search class="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          bind:value={sourceSearch}
          placeholder={chinese ? '检索部门或节点...' : 'Search tree...'}
          class="h-7 w-full rounded border border-input bg-muted/20 pl-7.5 pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>

    <!-- Tree Body -->
    <div class="flex-1 overflow-y-auto p-3 space-y-1">
      {#each treeData as node (node.id)}
        {@const isCollapsed = collapsedNodes.has(node.id)}
        {@const isChecked = isNodeChecked(node)}
        {@const isIndet = isNodeIndeterminate(node)}
        <div class="space-y-1">
          <div class="flex items-center gap-1.5 hover:bg-muted/40 py-1 px-1.5 rounded cursor-pointer select-none">
            {#if node.children && node.children.length > 0}
              <button
                type="button"
                onclick={() => toggleCollapse(node.id)}
                class="p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Toggle node"
              >
                {#if isCollapsed}
                  <ChevronRight class="h-3.5 w-3.5" />
                {:else}
                  <ChevronDown class="h-3.5 w-3.5" />
                {/if}
              </button>
            {:else}
              <span class="w-4"></span>
            {/if}

            <Checkbox
              checked={isChecked}
              indeterminate={isIndet}
              onCheckedChange={() => toggleNodeCheck(node)}
              aria-label={node.label}
            />

            <span class="font-medium text-foreground truncate">{node.label}</span>
          </div>

          <!-- Child branch -->
          {#if node.children && !isCollapsed}
            <div class="pl-5 space-y-1 border-l border-border/50 ml-2">
              {#each node.children as child (child.id)}
                {@const isChildChecked = isNodeChecked(child)}
                {@const isChildIndet = isNodeIndeterminate(child)}
                <div class="flex items-center gap-1.5 hover:bg-muted/40 py-0.5 px-1.5 rounded cursor-pointer select-none">
                  <Checkbox
                    checked={isChildChecked}
                    indeterminate={isChildIndet}
                    onCheckedChange={() => toggleNodeCheck(child)}
                    aria-label={child.label}
                  />
                  <span class="text-foreground truncate">{child.label}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Middle Action Controls -->
  <div class="flex md:flex-col items-center justify-center gap-2">
    <Button
      type="button"
      size="icon"
      class="h-8 w-8"
      disabled={selectedSourceKeys.size === 0}
      onclick={moveToTarget}
      title={chinese ? '穿梭指派至右侧' : 'Assign to right'}
    >
      <ArrowRight class="h-4 w-4" />
    </Button>

    <Button
      type="button"
      variant="outline"
      size="icon"
      class="h-8 w-8"
      disabled={selectedTargetKeys.size === 0}
      onclick={removeFromTarget}
      title={chinese ? '移除选中项' : 'Remove selected'}
    >
      <ArrowLeft class="h-4 w-4" />
    </Button>
  </div>

  <!-- Right Panel: Target List -->
  <div class="flex flex-col h-80 rounded-md border border-border bg-background overflow-hidden">
    <!-- Panel Header -->
    <div class="flex items-center justify-between border-b border-border/70 px-4 py-2.5 bg-muted/30">
      <div class="flex items-center gap-1.5 font-semibold text-foreground">
        <Users class="h-3.5 w-3.5 text-success" />
        <span>{resolvedTargetTitle}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-mono text-primary font-bold">
          {targetNodes.length} {chinese ? '人/项' : 'items'}
        </span>
        {#if targetNodes.length > 0}
          <button
            type="button"
            onclick={clearAllTargets}
            class="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
          >
            {chinese ? '清空' : 'Clear'}
          </button>
        {/if}
      </div>
    </div>

    <!-- Search Target -->
    <div class="px-3 py-2 border-b border-border/50 bg-background">
      <div class="relative flex items-center">
        <Search class="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          bind:value={targetSearch}
          placeholder={chinese ? '搜索已指派项...' : 'Filter assigned...'}
          class="h-7 w-full rounded border border-input bg-muted/20 pl-7.5 pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>

    <!-- Target List Items -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      {#each targetNodes as item (item.id)}
        <div class="flex items-center justify-between rounded-lg border border-border/60 bg-card p-2 hover:bg-muted/30 transition-colors">
          <label class="flex items-center gap-2 cursor-pointer flex-1 min-w-0 pr-2">
            <input
              type="checkbox"
              checked={selectedTargetKeys.has(item.id)}
              onchange={(e) => {
                const next = new Set(selectedTargetKeys);
                if ((e.target as HTMLInputElement).checked) next.add(item.id);
                else next.delete(item.id);
                selectedTargetKeys = next;
              }}
            />
            <span class="truncate font-medium text-foreground">{item.label}</span>
          </label>

          <button
            type="button"
            onclick={() => removeSingleTarget(item.id)}
            class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label="Remove item"
          >
            <X class="h-3 w-3" />
          </button>
        </div>
      {/each}

      {#if targetNodes.length === 0}
        <div class="py-12 text-center text-muted-foreground text-xs">
          {chinese ? '暂未指派节点，请从左侧勾选' : 'No nodes assigned yet'}
        </div>
      {/if}
    </div>
  </div>
</div>
