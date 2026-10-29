<script lang="ts">
  import { untrack } from 'svelte';
  import { ChevronRight, Loader2 } from '@lucide/svelte';
  import { Checkbox } from './ui/checkbox/index.js';
  import { cn } from '../utils.js';

  export type TreeNode = {
    id: string;
    label: string;
    children?: TreeNode[];
    disabled?: boolean;
    isLeaf?: boolean;
    hasChildren?: boolean;
  };

  export interface TreeCheckInfo {
    checkedKeys: string[];
    halfCheckedKeys: string[];
  }

  export interface TreeDragInfo {
    dragId: string;
    dropId: string;
    position: 'before' | 'inside' | 'after';
  }

  interface Props {
    nodes?: TreeNode[];
    /** Controlled expansion; omit for uncontrolled behavior. */
    expandedKeys?: string[];
    selectedKeys?: string[];
    checkedKeys?: string[];
    checkable?: boolean;
    multiple?: boolean;
    defaultExpandAll?: boolean;
    showLine?: boolean;
    draggable?: boolean;
    disabled?: boolean;
    loadChildren?: (node: TreeNode) => Promise<TreeNode[]>;
    emptyText?: string;
    class?: string;
    onexpand?: (keys: string[]) => void;
    onselect?: (keys: string[], nodes: TreeNode[]) => void;
    oncheck?: (keys: string[], info: TreeCheckInfo) => void;
    onload?: (id: string, children: TreeNode[]) => void;
    ondragend?: (info: TreeDragInfo) => void;
  }

  let {
    nodes = $bindable([]),
    expandedKeys = $bindable(undefined),
    selectedKeys = $bindable([]),
    checkedKeys = $bindable([]),
    checkable = false,
    multiple = false,
    defaultExpandAll = false,
    showLine = false,
    draggable = false,
    disabled = false,
    loadChildren,
    emptyText = 'No data',
    class: className = '',
    onexpand,
    onselect,
    oncheck,
    onload,
    ondragend,
  }: Props = $props();

  let internalExpanded = $state<string[]>(untrack(() => defaultExpandAll ? collectIds(nodes) : []));
  let loaded = $state<Record<string, TreeNode[]>>({});
  let loading = $state<Record<string, boolean>>({});
  let loadErrors = $state<Record<string, string>>({});
  let focusedId = $state<string | undefined>(undefined);
  let dragId = $state<string | undefined>(undefined);
  let dropTarget = $state<{ id: string; position: TreeDragInfo['position'] } | undefined>(undefined);

  function collectIds(items: TreeNode[]): string[] {
    return items.flatMap((node) => [node.id, ...(node.children ? collectIds(node.children) : [])]);
  }

  function childrenOf(node: TreeNode): TreeNode[] | undefined {
    return loaded[node.id] ?? node.children;
  }

  const effectiveNodes = $derived(nodes.map((node): TreeNode => {
    const children = childrenOf(node);
    return children === undefined ? { ...node } : { ...node, children };
  }));

  const index = $derived.by(() => {
    const map = new Map<string, { node: TreeNode; parentId?: string; depth: number }>();
    const walk = (items: TreeNode[], depth: number, parentId?: string) => {
      for (const node of items) {
        map.set(node.id, { node, depth, ...(parentId === undefined ? {} : { parentId }) });
        const children = childrenOf(node);
        if (children) walk(children, depth + 1, node.id);
      }
    };
    walk(effectiveNodes, 0);
    return map;
  });

  const expanded = $derived(new Set(expandedKeys ?? internalExpanded));

  const visible = $derived.by(() => {
    const out: Array<{ node: TreeNode; depth: number; parentId?: string }> = [];
    const walk = (items: TreeNode[], depth: number, parentId?: string) => {
      for (const node of items) {
        out.push({ node, depth, ...(parentId === undefined ? {} : { parentId }) });
        const children = childrenOf(node);
        if (children && expanded.has(node.id)) walk(children, depth + 1, node.id);
      }
    };
    walk(effectiveNodes, 0);
    return out;
  });

  const selected = $derived(new Set(selectedKeys));
  const checked = $derived(new Set(checkedKeys));

  function setExpanded(next: string[]): void {
    if (expandedKeys === undefined) internalExpanded = next;
    else expandedKeys = next;
    onexpand?.(next);
  }

  function needsLoad(node: TreeNode): boolean {
    return Boolean(loadChildren) && childrenOf(node) === undefined && node.isLeaf !== true && node.hasChildren !== false;
  }

  async function loadNode(node: TreeNode): Promise<void> {
    if (!loadChildren || loading[node.id]) return;
    loading = { ...loading, [node.id]: true };
    loadErrors = Object.fromEntries(Object.entries(loadErrors).filter(([key]) => key !== node.id));
    try {
      const children = await loadChildren(node);
      loaded = { ...loaded, [node.id]: children };
      onload?.(node.id, children);
    } catch {
      loadErrors = { ...loadErrors, [node.id]: 'Load failed' };
    } finally {
      loading = { ...loading, [node.id]: false };
    }
  }

  async function toggleExpand(node: TreeNode): Promise<void> {
    if (disabled || node.disabled) return;
    if (expanded.has(node.id)) {
      setExpanded([...expanded].filter((id) => id !== node.id));
      return;
    }
    if (needsLoad(node)) await loadNode(node);
    setExpanded([...expanded, node.id]);
  }

  function selectNode(node: TreeNode): void {
    if (disabled || node.disabled) return;
    const next = multiple
      ? (selected.has(node.id) ? selectedKeys.filter((id) => id !== node.id) : [...selectedKeys, node.id])
      : [node.id];
    selectedKeys = next;
    onselect?.(next, next.map((id) => index.get(id)?.node).filter((value): value is TreeNode => value !== undefined));
  }

  function subtreeIds(node: TreeNode): string[] {
    const children = childrenOf(node);
    return [node.id, ...(children ? children.flatMap(subtreeIds) : [])];
  }

  function checkState(node: TreeNode, keys: ReadonlySet<string> = checked): 'checked' | 'half' | 'none' {
    const children = childrenOf(node);
    if (!children?.length) return keys.has(node.id) ? 'checked' : 'none';
    const states = children.map((child) => checkState(child, keys));
    if (states.every((state) => state === 'checked')) return 'checked';
    if (states.some((state) => state !== 'none')) return 'half';
    return keys.has(node.id) ? 'checked' : 'none';
  }

  function halfCheckedKeys(): string[] {
    return [...index.keys()].filter((id) => {
      const entry = index.get(id);
      return entry !== undefined && checkState(entry.node) === 'half';
    });
  }

  function toggleCheck(node: TreeNode): void {
    if (disabled || node.disabled) return;
    const ids = subtreeIds(node).filter((id) => {
      const target = index.get(id)?.node;
      return target !== undefined && !target.disabled;
    });
    const next = new Set(checkedKeys);
    const allChecked = ids.every((id) => next.has(id));
    for (const id of ids) {
      if (allChecked) next.delete(id);
      else next.add(id);
    }
    let parentId = index.get(node.id)?.parentId;
    while (parentId !== undefined) {
      const parent = index.get(parentId)?.node;
      if (!parent) break;
      const children = childrenOf(parent) ?? [];
      const enabled = children.filter((child) => !child.disabled);
      if (enabled.length > 0 && enabled.every((child) => checkState(child, next) === 'checked')) next.add(parent.id);
      else next.delete(parent.id);
      parentId = index.get(parentId)?.parentId;
    }
    checkedKeys = [...next];
    oncheck?.(checkedKeys, { checkedKeys, halfCheckedKeys: halfCheckedKeys() });
  }

  function moveFocus(delta: number): void {
    if (visible.length === 0) return;
    const current = visible.findIndex((item) => item.node.id === focusedId);
    const next = Math.max(0, Math.min(visible.length - 1, current < 0 ? 0 : current + delta));
    const target = visible[next];
    if (!target) return;
    focusedId = target.node.id;
    queueMicrotask(() => document.getElementById(`svadmin-tree-node-${target.node.id}`)?.focus());
  }

  function handleKeydown(event: KeyboardEvent, item: { node: TreeNode; parentId?: string }): void {
    if (disabled) return;
    const node = item.node;
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); moveFocus(1); break;
      case 'ArrowUp': event.preventDefault(); moveFocus(-1); break;
      case 'Home': event.preventDefault(); focusedId = visible[0]?.node.id; break;
      case 'End': event.preventDefault(); focusedId = visible[visible.length - 1]?.node.id; break;
      case 'ArrowRight':
        event.preventDefault();
        if (!expanded.has(node.id)) void toggleExpand(node);
        else if (childrenOf(node)?.[0]) moveFocus(1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (expanded.has(node.id)) setExpanded([...expanded].filter((id) => id !== node.id));
        else if (item.parentId) {
          focusedId = item.parentId;
          queueMicrotask(() => document.getElementById(`svadmin-tree-node-${item.parentId}`)?.focus());
        }
        break;
      case 'Enter': event.preventDefault(); selectNode(node); break;
      case ' ': event.preventDefault(); if (checkable) toggleCheck(node); else selectNode(node); break;
    }
  }

  function handleDragStart(event: DragEvent, node: TreeNode): void {
    if (!draggable || disabled || node.disabled) return;
    dragId = node.id;
    event.dataTransfer?.setData('text/plain', node.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(event: DragEvent, node: TreeNode): void {
    if (!draggable || disabled || node.disabled || dragId === undefined || dragId === node.id) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offset = event.clientY - rect.top;
    const position: TreeDragInfo['position'] = offset < rect.height / 3 ? 'before' : offset > (rect.height * 2) / 3 ? 'after' : 'inside';
    dropTarget = { id: node.id, position };
  }

  function handleDrop(event: DragEvent, node: TreeNode): void {
    if (!draggable || dragId === undefined) return;
    event.preventDefault();
    const position = dropTarget?.id === node.id ? dropTarget.position : 'inside';
    ondragend?.({ dragId, dropId: node.id, position });
    dragId = undefined;
    dropTarget = undefined;
  }

  const toggleable = (node: TreeNode): boolean => Boolean(childrenOf(node)?.length) || needsLoad(node);
</script>

<div
  class={cn('svadmin-tree', showLine && 'svadmin-tree--lines', className)}
  role="tree"
  aria-multiselectable={multiple || checkable}
  aria-disabled={disabled || undefined}
  data-disabled={disabled || undefined}
>
  {#each visible as item, position (item.node.id)}
    {@const node = item.node}
    {@const state = checkable ? checkState(node) : 'none'}
    <div
      id={`svadmin-tree-node-${node.id}`}
      role="treeitem"
      aria-level={item.depth + 1}
      aria-selected={selected.has(node.id)}
      aria-expanded={toggleable(node) ? expanded.has(node.id) : undefined}
      aria-checked={checkable ? (state === 'half' ? 'mixed' : state === 'checked') : undefined}
      aria-disabled={node.disabled || disabled || undefined}
      tabindex={focusedId === node.id || (focusedId === undefined && position === 0) ? 0 : -1}
      class="svadmin-tree__row"
      class:is-selected={selected.has(node.id)}
      class:is-disabled={disabled || node.disabled}
      class:is-dragging={dragId === node.id}
      data-drop-position={dropTarget?.id === node.id ? dropTarget.position : undefined}
      draggable={draggable && !disabled && !node.disabled ? 'true' : undefined}
      onclick={() => selectNode(node)}
      onfocusin={() => { focusedId = node.id; }}
      onkeydown={(event) => handleKeydown(event, item)}
      ondragstart={(event) => handleDragStart(event, node)}
      ondragover={(event) => handleDragOver(event, node)}
      ondragleave={() => { if (dropTarget?.id === node.id) dropTarget = undefined; }}
      ondrop={(event) => handleDrop(event, node)}
    >
      <span class="svadmin-tree__indent" style:padding-inline-start={`${item.depth * 1.25}rem`}>
        {#if toggleable(node)}
          <button
            type="button"
            class="svadmin-tree__switcher"
            aria-label={`${expanded.has(node.id) ? 'Collapse' : 'Expand'} ${node.label}`}
            tabindex="-1"
            disabled={disabled || node.disabled}
            onclick={(event) => { event.stopPropagation(); void toggleExpand(node); }}
          >
            {#if loading[node.id]}
              <Loader2 class="svadmin-tree__spinner" size={14} />
            {:else}
              <span class="svadmin-tree__chevron-wrap" class:is-open={expanded.has(node.id)}><ChevronRight class="svadmin-tree__chevron" size={14} /></span>
            {/if}
          </button>
        {:else}
          <span class="svadmin-tree__switcher svadmin-tree__switcher--leaf" aria-hidden="true"></span>
        {/if}

        {#if checkable}
          <Checkbox
            checked={state === 'checked'}
            indeterminate={state === 'half'}
            disabled={disabled || node.disabled}
            onclick={(event: MouseEvent) => event.stopPropagation()}
            onCheckedChange={() => toggleCheck(node)}
            aria-label={`Select ${node.label}`}
          />
        {/if}

        <span class="svadmin-tree__label">{node.label}</span>
        {#if loadErrors[node.id]}<span class="svadmin-tree__error" role="alert">Load failed</span>{/if}
      </span>
    </div>
  {:else}
    <p class="svadmin-tree__empty">{emptyText}</p>
  {/each}
</div>

<style>
  .svadmin-tree {
    display: grid;
    gap: 1px;
    color: var(--foreground);
    font-size: var(--svadmin-text-label);
  }
  .svadmin-tree__row {
    position: relative;
    border-radius: var(--radius-sm);
    cursor: pointer;
    outline: none;
  }
  .svadmin-tree__row:hover { background: var(--accent); }
  .svadmin-tree__row.is-selected { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
  .svadmin-tree__row:focus-visible { box-shadow: inset 0 0 0 2px var(--ring); }
  .svadmin-tree__row.is-disabled { cursor: not-allowed; opacity: 0.5; }
  .svadmin-tree__row.is-dragging { opacity: 0.45; }
  .svadmin-tree__row[data-drop-position='inside'] { background: color-mix(in srgb, var(--primary) 14%, transparent); }
  .svadmin-tree__row[data-drop-position='before']::before,
  .svadmin-tree__row[data-drop-position='after']::after {
    position: absolute;
    inset-inline: 0;
    height: 2px;
    background: var(--primary);
    content: '';
  }
  .svadmin-tree__row[data-drop-position='before']::before { inset-block-start: 0; }
  .svadmin-tree__row[data-drop-position='after']::after { inset-block-end: 0; }
  .svadmin-tree__indent {
    display: flex;
    align-items: center;
    gap: var(--svadmin-space-1);
    min-height: 2rem;
    padding-block: 0.2rem;
    padding-inline-end: var(--svadmin-space-2);
  }
  .svadmin-tree__switcher {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
  }
  .svadmin-tree__switcher:hover { background: var(--muted); color: var(--foreground); }
  .svadmin-tree__switcher:disabled { cursor: not-allowed; }
  .svadmin-tree__switcher--leaf { pointer-events: none; }
  .svadmin-tree__chevron-wrap { display: inline-flex; transition: transform var(--svadmin-motion-fast) var(--svadmin-motion-easing); }
  .svadmin-tree__chevron-wrap.is-open { transform: rotate(90deg); }
  .svadmin-tree__spinner { animation: svadmin-tree-spin 0.8s linear infinite; }
  .svadmin-tree__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-tree__error { color: var(--destructive); font-size: var(--svadmin-text-caption); }
  .svadmin-tree__empty { margin: 0; padding: var(--svadmin-space-4); color: var(--muted-foreground); text-align: center; }
  .svadmin-tree--lines .svadmin-tree__row::before {
    position: absolute;
    inset-block: 0;
    inset-inline-start: calc(var(--svadmin-tree-line-offset, 0) + 0.6rem);
    width: 1px;
    background: var(--border);
    content: '';
  }
  @keyframes svadmin-tree-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .svadmin-tree__chevron-wrap { transition: none; }
  }
</style>
