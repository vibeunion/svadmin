<script module lang="ts">
  export type FileTreeNodeType = 'file' | 'directory';

  export interface FileTreeNode {
    id: string;
    name: string;
    type: FileTreeNodeType;
    path?: string;
    children?: FileTreeNode[];
    disabled?: boolean;
    metadata?: string;
  }

  export interface FileTreeRenderContext {
    node: FileTreeNode;
    depth: number;
    selected: boolean;
    expanded: boolean;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { ChevronRight, File, Folder, FolderOpen } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { provideFileTreeContext } from './context.svelte.js';

  interface FlatNode {
    node: FileTreeNode;
    depth: number;
    parentId?: string;
  }

  interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'class' | 'onselect' | 'ontoggle'> {
    nodes?: FileTreeNode[];
    label?: string;
    id?: string;
    selectedId?: string;
    expandedIds?: string[];
    expanded?: ReadonlySet<string>;
    defaultExpanded?: ReadonlySet<string>;
    selectedPath?: string;
    class?: string;
    node?: Snippet<[FileTreeRenderContext]>;
    children?: Snippet;
    onselect?: (node: FileTreeNode) => void;
    ontoggle?: (node: FileTreeNode, expanded: boolean) => void;
    onSelect?: (path: string) => void;
    onExpandedChange?: (expanded: Set<string>) => void;
  }

  let {
    nodes = [],
    label = 'Files',
    id,
    selectedId = $bindable(),
    expandedIds = $bindable<string[]>([]),
    expanded,
    defaultExpanded,
    selectedPath,
    class: className = '',
    node: nodeSnippet,
    children,
    onselect,
    ontoggle,
    onSelect,
    onExpandedChange,
    ...rest
  }: Props = $props();

  let focusedId = $state<string | undefined>();
  let internalExpanded = $state<Set<string> | undefined>();
  const generatedId = $props.id();
  const treeId = $derived(id ?? generatedId);
  const expandedSet = $derived(expanded ?? internalExpanded ?? (expandedIds.length ? new Set(expandedIds) : new Set(defaultExpanded ?? [])));
  const activeSelectedPath = $derived(selectedPath ?? selectedId);
  const flatNodes = $derived(flattenNodes(nodes, expandedSet));
  const activeFocusedId = $derived(flatNodes.some((entry) => entry.node.id === focusedId) ? focusedId : activeSelectedPath ?? flatNodes[0]?.node.id);

  function flattenNodes(source: FileTreeNode[], expanded: ReadonlySet<string>, depth = 1, parentId?: string): FlatNode[] {
    const flattened: FlatNode[] = [];
    for (const node of source) {
      flattened.push({ node, depth, parentId });
      if (node.type === 'directory' && expanded.has(node.id) && node.children?.length) {
        flattened.push(...flattenNodes(node.children, expanded, depth + 1, node.id));
      }
    }
    return flattened;
  }

  function isDirectory(node: FileTreeNode): boolean {
    return node.type === 'directory';
  }

  function toggle(node: FileTreeNode, force?: boolean): void {
    if (!isDirectory(node) || node.disabled) return;
    const nextExpanded = force ?? !expandedSet.has(node.id);
    const next = new Set(expandedSet);
    if (nextExpanded) next.add(node.id); else next.delete(node.id);
    if (expanded === undefined) { internalExpanded = next; expandedIds = [...next]; }
    ontoggle?.(node, nextExpanded);
    onExpandedChange?.(next);
  }

  function select(node: FileTreeNode): void {
    if (node.disabled) return;
    focusedId = node.id;
    if (selectedPath === undefined) selectedId = node.id;
    onselect?.(node);
    onSelect?.(node.path ?? node.id);
  }

  function focusNode(nodeId: string): void {
    focusedId = nodeId;
    if (typeof document === 'undefined') return;
    queueMicrotask(() => document.getElementById(domId(nodeId))?.focus());
  }

  function domId(nodeId: string): string {
    return `${treeId}-node-${encodeURIComponent(nodeId)}`;
  }

  provideFileTreeContext({
    get selectedPath() { return activeSelectedPath; },
    get expandedPaths() { return expandedSet; },
    get onSelect() { return onSelect; },
    get onExpandedChange() { return onExpandedChange; },
    selectPath(path) { if (selectedPath === undefined) selectedId = path; onSelect?.(path); },
    togglePath(path) {
      const next = new Set(expandedSet);
      if (next.has(path)) next.delete(path); else next.add(path);
      if (expanded === undefined) { internalExpanded = next; expandedIds = [...next]; }
      onExpandedChange?.(next);
    },
  });

  function handleKeydown(event: KeyboardEvent, entry: FlatNode, index: number): void {
    const { node } = entry;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = flatNodes[Math.min(index + 1, flatNodes.length - 1)];
      if (next) focusNode(next.node.id);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const previous = flatNodes[Math.max(index - 1, 0)];
      if (previous) focusNode(previous.node.id);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      if (flatNodes[0]) focusNode(flatNodes[0].node.id);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      const last = flatNodes.at(-1);
      if (last) focusNode(last.node.id);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (isDirectory(node) && !expandedSet.has(node.id)) toggle(node, true);
      else if (isDirectory(node)) {
        const child = flatNodes[index + 1];
        if (child?.parentId === node.id) focusNode(child.node.id);
      }
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (isDirectory(node) && expandedSet.has(node.id)) toggle(node, false);
      else if (entry.parentId) focusNode(entry.parentId);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(node);
      if (isDirectory(node)) toggle(node);
    }
  }
</script>

<section {...rest} class={cn('svadmin-ai-file-tree', className)} role={children && nodes.length === 0 ? 'tree' : undefined} data-slot="file-tree">
  <div class="svadmin-ai-file-tree__header">
    <h3>{label}</h3>
    <span>{flatNodes.length} visible</span>
  </div>
  <div class="svadmin-ai-file-tree__tree" role={children && nodes.length === 0 ? undefined : 'tree'} aria-label={children && nodes.length === 0 ? undefined : label}>
    {#if children && nodes.length === 0}
      {@render children()}
    {:else}
    {#each flatNodes as entry, index (entry.node.id)}
      {@const itemExpanded = isDirectory(entry.node) ? expandedSet.has(entry.node.id) : undefined}
      {@const itemSelected = activeSelectedPath === entry.node.id || activeSelectedPath === entry.node.path}
      <button
        id={domId(entry.node.id)}
        type="button"
        role="treeitem"
        class={cn('svadmin-ai-file-tree__item', itemSelected && 'svadmin-ai-file-tree__item--selected')}
        style={`--tree-depth: ${entry.depth - 1}`}
        aria-level={entry.depth}
        aria-expanded={itemExpanded}
        aria-selected={itemSelected}
        aria-disabled={entry.node.disabled}
        tabindex={activeFocusedId === entry.node.id ? 0 : -1}
        disabled={entry.node.disabled}
        onclick={() => select(entry.node)}
        ondblclick={() => toggle(entry.node)}
        onfocus={() => { focusedId = entry.node.id; }}
        onkeydown={(event) => handleKeydown(event, entry, index)}
      >
        <span class={cn('svadmin-ai-file-tree__chevron', itemExpanded && 'svadmin-ai-file-tree__chevron--open')} aria-hidden="true">
          {#if isDirectory(entry.node)}<ChevronRight size={14} />{/if}
        </span>
        <span class="svadmin-ai-file-tree__icon" aria-hidden="true">
          {#if isDirectory(entry.node)}{#if itemExpanded}<FolderOpen size={15} />{:else}<Folder size={15} />{/if}{:else}<File size={15} />{/if}
        </span>
        {#if nodeSnippet}
          {@render nodeSnippet({ node: entry.node, depth: entry.depth, selected: itemSelected, expanded: itemExpanded ?? false })}
        {:else}
          <span class="svadmin-ai-file-tree__name">{entry.node.name}</span>
          {#if entry.node.metadata}<span class="svadmin-ai-file-tree__metadata">{entry.node.metadata}</span>{/if}
        {/if}
      </button>
    {:else}
      <p class="svadmin-ai-file-tree__empty">No files available.</p>
    {/each}
    {/if}
  </div>
</section>

<style>
  .svadmin-ai-file-tree { overflow: hidden; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, transparent); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-file-tree__header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .65rem .8rem; border-bottom: 1px solid var(--border, currentColor); }
  h3 { margin: 0; font-size: .82rem; font-weight: 650; }
  .svadmin-ai-file-tree__header span { color: var(--muted-foreground, currentColor); font-size: .7rem; }
  .svadmin-ai-file-tree__tree { display: grid; max-height: 30rem; overflow: auto; padding: .35rem; }
  .svadmin-ai-file-tree__item { display: flex; width: 100%; min-width: 0; align-items: center; gap: .4rem; padding: .4rem .5rem .4rem calc(.5rem + var(--tree-depth) * 1rem); border: 0; border-radius: min(var(--radius, .5rem), .35rem); background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; }
  .svadmin-ai-file-tree__item:hover:not(:disabled) { background: var(--muted, transparent); }
  .svadmin-ai-file-tree__item--selected { background: var(--accent, var(--muted, transparent)); color: var(--accent-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-file-tree__item:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: -2px; }
  .svadmin-ai-file-tree__item:disabled { cursor: not-allowed; opacity: .5; }
  .svadmin-ai-file-tree__chevron { display: inline-flex; width: .9rem; flex: none; transition: transform 120ms ease; }
  .svadmin-ai-file-tree__chevron--open { transform: rotate(90deg); }
  .svadmin-ai-file-tree__icon { display: inline-flex; flex: none; color: var(--muted-foreground, currentColor); }
  .svadmin-ai-file-tree__name { min-width: 0; flex: 1; overflow: hidden; font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-file-tree__metadata { flex: none; color: var(--muted-foreground, currentColor); font-size: .68rem; }
  .svadmin-ai-file-tree__empty { margin: 0; padding: .8rem; color: var(--muted-foreground, currentColor); font-size: .78rem; text-align: center; }
  @media (prefers-reduced-motion: reduce) { .svadmin-ai-file-tree__chevron { transition: none; } }
</style>
