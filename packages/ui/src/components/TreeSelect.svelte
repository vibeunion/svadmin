<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import { onDestroy, tick, untrack } from 'svelte';
  import { ChevronRight, ChevronDown, Check, X, Search, ChevronsUpDown, Loader2, Minus, RotateCw } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import * as Popover from './ui/popover/index.js';
  import { Input } from './ui/input/index.js';
  import { Badge } from './ui/badge/index.js';
  import { useTranslation } from '@svadmin/core/i18n';

  export interface TreeSelectOption {
    value: string | number;
    label: string;
    children?: TreeSelectOption[];
    hasChildren?: boolean;
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
    loadChildren?: (node: TreeSelectOption) => Promise<TreeSelectOption[]>;
    virtualized?: boolean;
    itemHeight?: number;
    viewportHeight?: number;
    class?: string;
    onchange?: (value: string | number | (string | number)[] | undefined) => void;
  }

  let {
    options = $bindable([]),
    value = $bindable(undefined),
    multiple = false,
    placeholder,
    searchable = true,
    onlyLeafSelectable = false,
    disabled = false,
    allowClear = true,
    loadChildren,
    virtualized = true,
    itemHeight = 36,
    viewportHeight = 280,
    class: className,
    onchange,
  }: Props = $props();

  let open = $state(false);
  let searchQuery = $state('');
  let loadingValues = new SvelteSet<string | number>();
  interface ChildLoad {
    node: TreeSelectOption;
    loader: NonNullable<Props['loadChildren']>;
    treeEpoch: number;
  }
  let loadErrors = new SvelteMap<string | number, ChildLoad>();
  let expandedNodes = new SvelteSet<string | number>();
  let mounted = true;
  let treeRoot: HTMLElement | undefined = $state();
  let treeScrollTop = $state(0);
  let treeRevision = $state(0);
  const loads = new Map<string | number, ChildLoad>();
  let observedOptions = untrack(() => options);
  let observedLoader = untrack(() => loadChildren);
  interface SelectionAttempt {
    key: string | number;
    epoch: number;
    loader: Props['loadChildren'];
    value: Props['value'];
  }
  let selectionAttempt = $state.raw<SelectionAttempt>();
  const selectionErrors = new SvelteSet<string | number>();
  let treeEpoch = 0;
  onDestroy(() => { mounted = false; loads.clear(); });

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

  // 禁用状态沿完整数据树传播，搜索裁剪不能重新启用后代。
  const disabledValues = $derived.by(() => {
    const keys = new Set<string | number>();
    function visit(nodes: TreeSelectOption[], inherited: boolean): void {
      for (const node of nodes) {
        const unavailable = inherited || node.disabled === true;
        if (unavailable) keys.add(node.value);
        if (node.children) visit(node.children, unavailable);
      }
    }
    visit(options, false);
    return keys;
  });

  // Selected values array normalized
  const selectedValues = $derived.by< (string | number)[]>(() => {
    if (value === undefined || value === null || value === '') return [];
    return Array.isArray(value) ? value : [value];
  });

  const selectedLabels = $derived.by(() => {
    return selectedValues.map((v) => optionMap.get(v)?.label ?? String(v));
  });

  $effect.pre(() => {
    // 外部替换根数组开启新数据版本；内部补充子节点保留当前版本。
    if (options !== observedOptions) {
      observedOptions = options;
      treeEpoch += 1;
      treeRevision += 1;
      selectionAttempt = undefined;
      selectionErrors.clear();
    }
    const loader = loadChildren;
    const unavailable = disabled;
    if (loader !== observedLoader || unavailable) {
      observedLoader = loader;
      selectionAttempt = undefined;
      selectionErrors.clear();
    }
    if (!multiple || onlyLeafSelectable || selectionAttempt?.value !== value) selectionAttempt = undefined;
    for (const [key, request] of loads) {
      if (unavailable || request.treeEpoch !== treeEpoch || loader !== request.loader) {
        loads.delete(key);
        loadingValues.delete(key);
        loadErrors.delete(key);
      }
    }
    for (const [key, request] of loadErrors) {
      if (unavailable || request.treeEpoch !== treeEpoch || loader !== request.loader) loadErrors.delete(key);
    }
  });

  function toggleExpand(nodeValue: string | number, event?: MouseEvent) {
    event?.stopPropagation();
    if (expandedNodes.has(nodeValue)) {
      expandedNodes.delete(nodeValue);
    } else {
      expandedNodes.add(nodeValue);
    }
  }

  function hasChildren(node: TreeSelectOption): boolean {
    return Boolean(node.hasChildren ?? (node.children && node.children.length > 0));
  }

  function isNodeExpanded(node: TreeSelectOption): boolean {
    if (searchQuery.trim()) return true; // Auto expand all on search
    return expandedNodes.has(node.value) || !!node.expanded;
  }

  function selectableLeaves(node: TreeSelectOption): TreeSelectOption[] {
    if (node.disabled) return [];
    if (!hasChildren(node)) return [node];
    if (!node.children) return [];
    return (node.children ?? []).flatMap(selectableLeaves);
  }

  function isSelected(val: string | number): boolean {
    return selectedValues.includes(val);
  }

  function isNodeSelected(node: TreeSelectOption): boolean {
    node = optionMap.get(node.value) ?? node;
    if (!multiple || !hasChildren(node)) return isSelected(node.value);
    const leaves = selectableLeaves(node);
    return leaves.length > 0 && !hasUnloadedDescendants(node) && leaves.every((leaf) => isSelected(leaf.value));
  }

  function hasUnloadedDescendants(node: TreeSelectOption): boolean {
    if (node.disabled || !hasChildren(node)) return false;
    if (!node.children) return true;
    return node.children.some(hasUnloadedDescendants);
  }

  function isPartiallySelected(node: TreeSelectOption): boolean {
    node = optionMap.get(node.value) ?? node;
    if (!multiple || !hasChildren(node)) return false;
    const leaves = selectableLeaves(node);
    const count = leaves.filter((leaf) => isSelected(leaf.value)).length;
    return count > 0 && (count < leaves.length || hasUnloadedDescendants(node));
  }

  function updateOptionsChildren(nodes: TreeSelectOption[], target: string | number, children: TreeSelectOption[]): TreeSelectOption[] {
    let changed = false;
    const next = nodes.map((node) => {
      if (node.value === target) {
        changed = true;
        return { ...node, children, hasChildren: children.length > 0 };
      }
      if (!node.children) return node;
      const updated = updateOptionsChildren(node.children, target, children);
      if (updated === node.children) return node;
      changed = true;
      return { ...node, children: updated };
    });
    return changed ? next : nodes;
  }

  async function ensureChildren(node: TreeSelectOption): Promise<boolean> {
    if (!mounted || disabled || disabledValues.has(node.value) || loadingValues.has(node.value)) return false;
    if (!node.hasChildren || node.children) return true;
    const currentNode = optionMap.get(node.value);
    if (!loadChildren || !currentNode) return false;
    const request = { node: currentNode, loader: loadChildren, treeEpoch };
    loads.set(node.value, request);
    const current = () => mounted && !disabled && loads.get(node.value) === request
      && options === observedOptions && treeEpoch === request.treeEpoch
      && optionMap.has(node.value) && !disabledValues.has(node.value) && loadChildren === request.loader;
    loadingValues.add(node.value);
    loadErrors.delete(node.value);
    try {
      const children = await request.loader(request.node);
      if (!current()) return false;
      options = updateOptionsChildren(options, node.value, children);
      observedOptions = options;
      return true;
    } catch {
      if (current()) loadErrors.set(node.value, request);
      return false;
    } finally {
      if (mounted && loads.get(node.value) === request) {
        loads.delete(node.value);
        loadingValues.delete(node.value);
      }
    }
  }

  async function toggleExpandAsync(node: TreeSelectOption, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();
    if (!await ensureChildren(node)) return;
    if (!mounted || disabled) return;
    toggleExpand(node.value);
  }

  function retryChildren(node: TreeSelectOption, event: MouseEvent): void {
    event.stopPropagation();
    if (selectionErrors.has(node.value)) void handleSelect(node);
    else void toggleExpandAsync(node);
  }

  function setMultipleSelection(node: TreeSelectOption): void {
    const leaves = selectableLeaves(node);
    if (leaves.length === 0) return;
    const leafValues = new Set(leaves.map((leaf) => leaf.value));
    const shouldRemove = leaves.length > 0 && leaves.every((leaf) => isSelected(leaf.value));
    const next = shouldRemove
      ? selectedValues.filter((value) => !leafValues.has(value))
      : [...selectedValues, ...leaves.map((leaf) => leaf.value).filter((value) => !isSelected(value))];
    value = next;
    onchange?.(next);
  }

  function isCurrentSelection(attempt: SelectionAttempt): boolean {
    return mounted && !disabled && multiple && !onlyLeafSelectable
      && selectionAttempt === attempt && attempt.epoch === treeEpoch
      && options === observedOptions && attempt.loader === loadChildren && attempt.value === value;
  }

  async function selectSubtree(node: TreeSelectOption): Promise<void> {
    if (selectionAttempt?.key === node.value && isCurrentSelection(selectionAttempt)) return;
    const attempt: SelectionAttempt = { key: node.value, epoch: treeEpoch, loader: loadChildren, value };
    selectionAttempt = attempt;
    selectionErrors.delete(node.value);
    let visited = 0;
    let requests = 0;
    // 级联加载有界且只在全部成功后写入选择；搜索裁剪不改变选择范围。
    async function loadSubtree(key: string | number, depth: number): Promise<boolean> {
      if (!isCurrentSelection(attempt)) return false;
      const currentNode = optionMap.get(key);
      if (!currentNode || ++visited > 10000 || depth > 64) return false;
      if (currentNode.disabled) return true;
      if (currentNode.hasChildren && !currentNode.children) {
        if (++requests > 100 || !await ensureChildren(currentNode)) return false;
      }
      if (!isCurrentSelection(attempt)) return false;
      const loaded = optionMap.get(key);
      if (!loaded) return false;
      for (const child of loaded.children ?? []) {
        if (!await loadSubtree(child.value, depth + 1)) return false;
      }
      return true;
    }
    try {
      if (!await loadSubtree(node.value, 0)) {
        if (isCurrentSelection(attempt)) selectionErrors.add(node.value);
        return;
      }
      if (isCurrentSelection(attempt)) {
        const loaded = optionMap.get(node.value);
        if (loaded) setMultipleSelection(loaded);
      }
    } finally {
      if (selectionAttempt === attempt) selectionAttempt = undefined;
    }
  }

  async function handleSelect(node: TreeSelectOption): Promise<void> {
    node = optionMap.get(node.value) ?? node;
    if (disabled || disabledValues.has(node.value)) return;
    if (selectionAttempt?.key === node.value && isCurrentSelection(selectionAttempt)) return;
    const nodeHasChildren = hasChildren(node);
    if (onlyLeafSelectable && nodeHasChildren) {
      await toggleExpandAsync(node);
      return;
    }

    if (multiple) {
      if (nodeHasChildren) {
        if (hasUnloadedDescendants(node)) await selectSubtree(node);
        else {
          selectionAttempt = undefined;
          selectionErrors.delete(node.value);
          setMultipleSelection(node);
        }
      }
      else {
        selectionAttempt = undefined;
        const next = isSelected(node.value)
          ? selectedValues.filter((selected) => selected !== node.value)
          : [...selectedValues, node.value];
        value = next;
        onchange?.(next);
      }
    } else {
      const next = node.value;
      value = next;
      onchange?.(next);
      open = false;
    }
  }

  function findParent(nodes: TreeSelectOption[], target: string | number, parent?: TreeSelectOption): TreeSelectOption | undefined {
    for (const node of nodes) {
      if (node.value === target) return parent;
      const match = node.children ? findParent(node.children, target, node) : undefined;
      if (match) return match;
    }
    return undefined;
  }

  function treeKey(value: string | number): string {
    return `${typeof value}:${String(value)}`;
  }

  async function focusTreeNode(valueToFocus: string | number): Promise<void> {
    const index = flatVisibleNodes.findIndex(entry => entry.node.value === valueToFocus);
    if (index < 0) return;
    if (shouldVirtualize && treeRoot) {
      const top = index * rowHeight;
      if (top < treeScrollTop || top + rowHeight > treeScrollTop + windowHeight) {
        treeScrollTop = Math.max(0, Math.min(top, totalHeight - windowHeight));
        treeRoot.scrollTop = treeScrollTop;
        await tick();
      }
    }
    if (!mounted) return;
    const element = treeRoot?.querySelector<HTMLElement>(`[data-tree-key="${CSS.escape(treeKey(valueToFocus))}"]`);
    element?.focus();
  }

  function focusSibling(nodeValue: string | number, offset: number): void {
    const index = flatVisibleNodes.findIndex(entry => entry.node.value === nodeValue);
    const target = flatVisibleNodes[index + offset];
    if (target) void focusTreeNode(target.node.value);
  }

  function handleTreeKeydown(event: KeyboardEvent, node: TreeSelectOption, expanded: boolean): void {
    if (event.target !== event.currentTarget) return;
    const nodeHasChildren = hasChildren(node);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void handleSelect(node);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusSibling(node.value, 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusSibling(node.value, -1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      const first = flatVisibleNodes[0];
      if (first) void focusTreeNode(first.node.value);
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = flatVisibleNodes[flatVisibleNodes.length - 1];
      if (last) void focusTreeNode(last.node.value);
    } else if (event.key === 'ArrowRight' && nodeHasChildren) {
      event.preventDefault();
      if (!expanded) void toggleExpandAsync(node);
      else {
        const index = flatVisibleNodes.findIndex(entry => entry.node.value === node.value);
        const current = flatVisibleNodes[index];
        const next = flatVisibleNodes[index + 1];
        if (current && next && next.level > current.level) void focusTreeNode(next.node.value);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (nodeHasChildren && expanded) toggleExpand(node.value);
      else {
        const parent = findParent(options, node.value);
        if (parent) void focusTreeNode(parent.value);
      }
    }
  }

  function clearAll(event?: MouseEvent | KeyboardEvent) {
    event?.stopPropagation();
    if (disabled) return;
    selectionAttempt = undefined;
    const next = multiple ? [] : undefined;
    value = next;
    onchange?.(next);
  }

  function removeSingle(val: string | number, event?: MouseEvent | KeyboardEvent) {
    event?.stopPropagation();
    if (disabled) return;
    selectionAttempt = undefined;
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
        filtered.push(definedOptions({
          ...node,
          children: filteredChildren ?? node.children,
        }));
      }
    }
    return filtered;
  }

  const visibleOptions = $derived(filterTree(options, searchQuery));

  interface VisibleNode {
    node: TreeSelectOption;
    level: number;
    position: number;
    size: number;
  }
  const flatVisibleNodes = $derived.by(() => {
    const result: VisibleNode[] = [];
    function visit(nodes: TreeSelectOption[], level: number): void {
      nodes.forEach((node, index) => {
        result.push({ node, level, position: index + 1, size: nodes.length });
        if (hasChildren(node) && isNodeExpanded(node) && node.children) visit(node.children, level + 1);
      });
    }
    visit(visibleOptions, 0);
    return result;
  });
  const rowHeight = $derived(Number.isSafeInteger(itemHeight) && itemHeight >= 32 && itemHeight <= 100 ? itemHeight : 36);
  const windowHeight = $derived(Number.isSafeInteger(viewportHeight) && viewportHeight >= 120 && viewportHeight <= 800 ? viewportHeight : 280);
  const shouldVirtualize = $derived(virtualized && flatVisibleNodes.length >= 200);
  const totalHeight = $derived(flatVisibleNodes.length * rowHeight);
  const clampedScrollTop = $derived(Math.max(0, Math.min(treeScrollTop, totalHeight - windowHeight)));
  const virtualStart = $derived(Math.max(0, Math.floor(clampedScrollTop / rowHeight) - 5));
  const virtualEnd = $derived(Math.min(flatVisibleNodes.length, Math.ceil((clampedScrollTop + windowHeight) / rowHeight) + 5));

  $effect(() => {
    // 搜索和外部数据替换从顶部开始；折叠或数据缩短只钳制窗口。
    void searchQuery;
    void treeRevision;
    treeScrollTop = 0;
    if (treeRoot) treeRoot.scrollTop = 0;
  });
  $effect(() => {
    if (treeScrollTop !== clampedScrollTop) {
      treeScrollTop = clampedScrollTop;
      if (treeRoot) treeRoot.scrollTop = clampedScrollTop;
    }
  });
</script>

{#snippet treeNode(node: TreeSelectOption, level: number, position: number, size: number, recursive = true)}
  {@const nodeHasChildren = hasChildren(optionMap.get(node.value) ?? node)}
  {@const expanded = isNodeExpanded(node)}
  {@const selected = isNodeSelected(node)}
  {@const partial = isPartiallySelected(node)}
  {@const busy = selectionAttempt?.key === node.value || loadingValues.has(node.value)}
  {@const unavailable = disabled || disabledValues.has(node.value)}

  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed">
    <div
      role="treeitem"
      tabindex="0"
      aria-selected={selected}
      aria-checked={multiple ? (partial ? 'mixed' : selected) : undefined}
      aria-disabled={unavailable ? 'true' : undefined}
      aria-busy={busy}
      aria-level={level + 1}
      aria-posinset={position}
      aria-setsize={size}
      aria-expanded={nodeHasChildren ? expanded : undefined}
      data-tree-value={String(node.value)}
      data-tree-key={treeKey(node.value)}
      class={cn(
        'group svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-58284b4ea568 svadmin-u-421ac2be5045 svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-7f6912283f11',
        selected ? 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069' : 'svadmin-u-68646cdcc246 svadmin-u-d4108abe6359',
        unavailable && 'svadmin-u-0b8c506a0596 svadmin-u-29b733e4c162 svadmin-u-a4326536b8f5'
      )}
      style={`padding-left:${level * 16 + 8}px;${recursive ? '' : `height:${rowHeight}px;min-height:${rowHeight}px;box-sizing:border-box;overflow:hidden;`}`}
      onclick={() => void handleSelect(node)}
      onkeydown={(e) => handleTreeKeydown(e, node, expanded)}
    >
      <div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
        {#if nodeHasChildren}
          <button
            type="button"
            disabled={unavailable}
            aria-label={`${node.label}: ${i18n.t('tree.toggleChildren')}`}
            aria-busy={busy}
            class="svadmin-u-60fbb7713999 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-07389a777c1f svadmin-u-bfa603190748 svadmin-u-8e551981c8d7"
            onclick={(e) => void toggleExpandAsync(node, e)}
          >
            {#if busy}
              <Loader2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" />
            {:else if expanded}
              <ChevronDown class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            {:else}
              <ChevronRight class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            {/if}
          </button>
        {:else}
          <span class="svadmin-u-bb0c4bfc52bd svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37"></span>
        {/if}

        <span class="svadmin-u-f283ea9bea0e">{node.label}</span>
      </div>

      {#if loadErrors.has(node.value) || selectionErrors.has(node.value)}
        <span role="alert" class="svadmin-u-bfa603190748">{i18n.t(selectionErrors.has(node.value) ? 'tree.selectionFailed' : 'tree.loadFailed')}</span>
        <button type="button" aria-label={`${node.label}: ${i18n.t('common.retry')}`}
          disabled={unavailable}
          title={i18n.t('common.retry')} onclick={(e) => retryChildren(node, e)}>
          <RotateCw class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        </button>
      {/if}

      {#if partial}
        <Minus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-20aaf08a7ed1" />
      {:else if selected}
        <Check class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-20aaf08a7ed1" />
      {/if}
    </div>

    {#if recursive && nodeHasChildren && expanded && node.children}
      <div role="group" class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed">
        {#each node.children as child, index (treeKey(child.value))}
          {@render treeNode(child, level + 1, index + 1, node.children.length)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<div class={cn('svadmin-u-d89972fe17d6 svadmin-u-6da6a3c3f741', className)} data-testid="tree-select">
  <Popover.Root bind:open>
    <Popover.Trigger class="svadmin-u-6da6a3c3f741">
      {#snippet child({ props })}
        <button
          type="button"
          {...props}
          {disabled}
          class={cn(
            'svadmin-u-60fbb7713999 svadmin-u-968a1e649bad svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-582e6ef4b245 svadmin-u-9c24ab70af61 svadmin-u-674ec2b09890 svadmin-u-608dd26cd5ba svadmin-u-80b9d0ae125f svadmin-u-6b22a22a9752 svadmin-u-5f533b3a7de7 svadmin-u-b29d8adbad2e svadmin-u-2eba0d65d059',
            open && 'svadmin-u-16b1efa5875e svadmin-u-3e1868fc53e2 svadmin-u-0c15f6cff5a0'
          )}
        >
          <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c">
            {#if selectedValues.length === 0}
              <span class="svadmin-u-bfa603190748">
                {placeholder ?? (i18n.t('field.selectPlaceholder', undefined) ?? '请选择...')}
              </span>
            {:else if multiple}
              {#each selectedValues as val (val)}
                {@const opt = optionMap.get(val)}
                <Badge variant="secondary" class="svadmin-u-cd0d9c512cdc svadmin-u-45d828117213 svadmin-u-68ecb30dbec6 svadmin-u-d058ca6de60f svadmin-u-44ee8ba0a421 svadmin-u-012fbd121f37">
                  <span>{opt?.label ?? val}</span>
                  {#if !disabled}
                    <span
                      role="button"
                      tabindex="0"
                      aria-label={i18n.t('tree.removeSelection', { label: opt?.label ?? String(val) })}
                      class="svadmin-u-51e95020d6f2 svadmin-u-34516836730d"
                      onclick={(e) => removeSingle(val, e)}
                      onkeydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          removeSingle(val, e);
                        }
                      }}
                    >
                      <X class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
                    </span>
                  {/if}
                </Badge>
              {/each}
            {:else}
              <span class="svadmin-u-f283ea9bea0e svadmin-u-d4108abe6359 svadmin-u-8ecebc9f80e6">
                {selectedLabels[0] ?? ''}
              </span>
            {/if}
          </div>

          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-012fbd121f37 svadmin-u-f58b02572ab2 svadmin-u-bfa603190748">
            {#if allowClear && selectedValues.length > 0 && !disabled}
              <span
                role="button"
                tabindex="0"
                aria-label={i18n.t('common.clearSelection')}
                class="svadmin-u-ea7b2e9e070e svadmin-u-34516836730d svadmin-u-de8350a3bbad"
                onclick={clearAll}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    clearAll(e);
                  }
                }}
              >
                <X class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
              </span>
            {/if}
            <ChevronsUpDown class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-0b8c506a0596" />
          </div>
        </button>
      {/snippet}
    </Popover.Trigger>

    <Popover.Content class="svadmin-u-4827635fb99f svadmin-u-cbc20887874e svadmin-u-7b17becb34a1 svadmin-u-7660b450905a" align="start">
      {#if searchable}
        <div class="svadmin-u-d89972fe17d6 svadmin-u-a77ed4d908c0">
          <Search class="svadmin-u-da4dbfbc4fdc svadmin-u-ecfeb742a3f3 svadmin-u-7a470f4c9b28 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-bfa603190748" />
          <Input
            type="text"
            bind:value={searchQuery}
            placeholder={i18n.t('common.search', undefined) ?? '搜索...'}
            class="svadmin-u-ed8a5df7b2fb svadmin-u-e4af885410fe svadmin-u-aa2c13a5e1b4 svadmin-u-359090c2d529"
          />
        </div>
      {/if}

      <div
        bind:this={treeRoot}
        role="tree"
        aria-multiselectable={multiple ? 'true' : undefined}
        class="svadmin-u-67d7e383dca6 svadmin-u-92bf82f493b1 svadmin-u-e2eedc5718f0 svadmin-u-eda955402ba6"
        style={shouldVirtualize ? `height:${windowHeight}px;max-height:${windowHeight}px;overflow-y:auto;padding:0;` : undefined}
        onscroll={(event) => { treeScrollTop = event.currentTarget.scrollTop; }}
      >
        {#if shouldVirtualize}
          <div style={`height:${totalHeight}px;position:relative;`}>
            <div style={`position:absolute;top:${virtualStart * rowHeight}px;left:0;right:0;`}>
              {#each flatVisibleNodes.slice(virtualStart, virtualEnd) as entry (treeKey(entry.node.value))}
                {@render treeNode(entry.node, entry.level, entry.position, entry.size, false)}
              {/each}
            </div>
          </div>
        {:else if visibleOptions.length > 0}
          {#each visibleOptions as rootNode, index (treeKey(rootNode.value))}
            {@render treeNode(rootNode, 0, index + 1, visibleOptions.length)}
          {/each}
        {:else}
          <div class="svadmin-u-940911bf310c svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
            {i18n.t('common.noData', undefined) ?? '无匹配选项'}
          </div>
        {/if}
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
