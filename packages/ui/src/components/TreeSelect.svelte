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
    id?: string;
    ariaLabel?: string;
    describedby?: string;
    invalid?: boolean;
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
    id,
    ariaLabel,
    describedby,
    invalid = false,
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

  const instanceId = $props.id();
  const triggerId = $derived(id ?? `${instanceId}-trigger`);
  const panelId = $derived(`${triggerId}-panel`);
  const treeId = `${instanceId}-tree`;
  let open = $state(false);
  let searchQuery = $state('');
  let loadingValues = new SvelteSet<string | number>();
  interface ChildLoad {
    node: TreeSelectOption;
    loader: NonNullable<Props['loadChildren']>;
    treeEpoch: number;
    selection: SelectionAttempt | undefined;
    promise: Promise<boolean>;
    retrying: boolean;
  }
  let loadErrors = new SvelteMap<string | number, ChildLoad>();
  let expandedOverrides = new SvelteMap<string | number, boolean>();
  let mounted = true;
  let treeRoot: HTMLElement | undefined = $state();
  let panelElement: HTMLDivElement | undefined = $state();
  let triggerElement: HTMLButtonElement | undefined = $state();
  let controlElement: HTMLDivElement | undefined = $state();
  let searchElement: HTMLInputElement | null = $state(null);
  let closedByOutsideInteraction = false;
  let outsideFocusTarget: HTMLElement | undefined;
  let activeTreeValue = $state<string | number>();
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
  const capabilityErrors = new SvelteSet<string | number>();
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
    void disabledValues;
    if (options !== observedOptions) {
      observedOptions = options;
      treeEpoch += 1;
      treeRevision += 1;
      expandedOverrides.clear();
      selectionAttempt = undefined;
      selectionErrors.clear();
      capabilityErrors.clear();
    }
    const loader = loadChildren;
    const unavailable = disabled;
    if (loader !== observedLoader || unavailable) {
      observedLoader = loader;
      selectionAttempt = undefined;
      selectionErrors.clear();
      capabilityErrors.clear();
    }
    if (!multiple || onlyLeafSelectable || selectionAttempt?.value !== value
      || selectionAttempt && disabledValues.has(selectionAttempt.key)) selectionAttempt = undefined;
    for (const [key, request] of loads) {
      if (unavailable || disabledValues.has(key)
        || request.treeEpoch !== treeEpoch || loader !== request.loader) {
        if (request.selection === selectionAttempt) selectionAttempt = undefined;
        loads.delete(key);
        loadingValues.delete(key);
        loadErrors.delete(key);
      }
    }
    for (const [key, request] of loadErrors) {
      if (unavailable || disabledValues.has(key)
        || request.treeEpoch !== treeEpoch || loader !== request.loader) loadErrors.delete(key);
    }
    for (const key of [...capabilityErrors]) {
      const current = optionMap.get(key);
      if (unavailable || disabledValues.has(key) || !current
        || !subtreeLacksLoadCapability(current)) {
        capabilityErrors.delete(key);
      }
    }
  });

  function toggleExpand(nodeValue: string | number, event?: MouseEvent) {
    event?.stopPropagation();
    const node = optionMap.get(nodeValue);
    if (!mounted || !node || disabled || disabledValues.has(nodeValue) || searchQuery.trim()) return;
    expandedOverrides.set(nodeValue, !isNodeExpanded(node));
  }

  function hasChildren(node: TreeSelectOption): boolean {
    return Boolean(node.hasChildren ?? (node.children && node.children.length > 0));
  }

  function lacksLoadCapability(node: TreeSelectOption): boolean {
    const current = optionMap.get(node.value) ?? node;
    return hasChildren(current) && !current.children && !loadChildren;
  }

  // 祖先反馈只有在整个可交互子树仍存在缺失加载能力的分支时保留。
  function subtreeLacksLoadCapability(node: TreeSelectOption, depth = 0): boolean {
    const current = optionMap.get(node.value) ?? node;
    if (current.disabled || depth > 64) return false;
    if (hasChildren(current) && !current.children) return !loadChildren;
    return (current.children ?? []).some(child => subtreeLacksLoadCapability(child, depth + 1));
  }

  function isNodeExpanded(node: TreeSelectOption): boolean {
    if (searchQuery.trim()) return true; // Auto expand all on search
    return expandedOverrides.has(node.value)
      ? expandedOverrides.get(node.value) === true
      : !!node.expanded;
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

  async function ensureChildren(node: TreeSelectOption, selection?: SelectionAttempt): Promise<boolean> {
    if (!mounted || disabled || disabledValues.has(node.value)) return false;
    const existing = loads.get(node.value);
    if (existing) {
      if (selection) existing.selection = selection;
      return existing.promise;
    }
    if (loadingValues.has(node.value)) return false;
    if (!node.hasChildren || node.children) return true;
    const currentNode = optionMap.get(node.value);
    if (!loadChildren || !currentNode) return false;
    const request: ChildLoad = {
      node: currentNode,
      loader: loadChildren,
      treeEpoch,
      selection,
      promise: Promise.resolve(false),
      retrying: false,
    };
    loads.set(node.value, request);
    const current = () => mounted && !disabled && loads.get(node.value) === request
      && options === observedOptions && treeEpoch === request.treeEpoch
      && optionMap.has(node.value) && !disabledValues.has(node.value) && loadChildren === request.loader;
    loadingValues.add(node.value);
    loadErrors.delete(node.value);
    // 展开和级联选择共享包含归属校验、写入与清理的完整请求结果。
    request.promise = (async () => {
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
    })();
    return request.promise;
  }

  async function toggleExpandAsync(node: TreeSelectOption, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();
    if (!mounted || disabled || disabledValues.has(node.value)) return;
    if (loadingValues.has(node.value)) return;
    if (lacksLoadCapability(node)) {
      capabilityErrors.add(node.value);
      return;
    }
    capabilityErrors.delete(node.value);
    if (!await ensureChildren(node)) return;
    if (!mounted || disabled) return;
    toggleExpand(node.value);
  }

  function ownerTreeItem(event: Event): HTMLElement | null {
    return event.currentTarget instanceof HTMLElement
      ? event.currentTarget.closest<HTMLElement>('[role="treeitem"]')
      : null;
  }

  function retryChildren(node: TreeSelectOption, event: Event): void {
    event.stopPropagation();
    const owner = ownerTreeItem(event);
    owner?.focus();
    if (selectionErrors.has(node.value)) void handleSelect(node);
    else void toggleExpandAsync(node);
    const request = loads.get(node.value);
    if (request) request.retrying = true;
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
      && !disabledValues.has(attempt.key)
      && options === observedOptions && attempt.loader === loadChildren && attempt.value === value;
  }

  async function selectSubtree(node: TreeSelectOption): Promise<void> {
    if (selectionAttempt?.key === node.value && isCurrentSelection(selectionAttempt)) return;
    const attempt: SelectionAttempt = { key: node.value, epoch: treeEpoch, loader: loadChildren, value };
    selectionAttempt = attempt;
    selectionErrors.delete(node.value);
    capabilityErrors.delete(node.value);
    let visited = 0;
    let requests = 0;
    let missingCapability = false;
    // 级联加载有界且只在全部成功后写入选择；搜索裁剪不改变选择范围。
    async function loadSubtree(key: string | number, depth: number): Promise<boolean> {
      if (!isCurrentSelection(attempt)) return false;
      const currentNode = optionMap.get(key);
      if (!currentNode || ++visited > 10000 || depth > 64) return false;
      if (currentNode.disabled) return true;
      if (currentNode.hasChildren && !currentNode.children) {
        if (lacksLoadCapability(currentNode)) {
          missingCapability = true;
          return false;
        }
        if (++requests > 100 || !await ensureChildren(currentNode, attempt)) return false;
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
        if (isCurrentSelection(attempt)) {
          if (missingCapability) capabilityErrors.add(node.value);
          else selectionErrors.add(node.value);
        }
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

  function nodeId(value: string | number): string {
    return `${instanceId}-node-${treeKey(value).split('').map(unit => unit.charCodeAt(0).toString(16)).join('-')}`;
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
    if (!mounted || !open) return;
    const element = treeRoot?.querySelector<HTMLElement>(`[data-tree-key="${CSS.escape(treeKey(valueToFocus))}"]`);
    element?.focus();
  }

  function focusSibling(nodeValue: string | number, offset: number): void {
    const index = flatVisibleNodes.findIndex(entry => entry.node.value === nodeValue);
    const target = flatVisibleNodes[index + offset];
    if (target) void focusTreeNode(target.node.value);
  }

  async function handleOpenAutoFocus(event: Event): Promise<void> {
    event.preventDefault();
    closedByOutsideInteraction = false;
    outsideFocusTarget = undefined;
    await tick();
    const panel = panelElement;
    if (!mounted || !open || !panel || !panel.isConnected || panel.contains(document.activeElement)) return;
    if (searchable && searchElement) {
      searchElement.focus();
      return;
    }
    const first = flatVisibleNodes[0];
    if (first) await focusTreeNode(first.node.value);
    if (!mounted || !open || panelElement !== panel || !panel.isConnected) return;
    if (!panel.contains(document.activeElement)) panel.focus();
  }

  async function handleCloseAutoFocus(event: Event): Promise<void> {
    event.preventDefault();
    const preserveOutsideFocus = closedByOutsideInteraction;
    const focusTarget = outsideFocusTarget;
    await tick();
    if (!mounted || open) return;
    if (preserveOutsideFocus) {
      const active = document.activeElement;
      if (focusTarget?.isConnected
        && (active === document.body || controlElement?.contains(active) || panelElement?.contains(active))) {
        focusTarget.focus();
      }
      return;
    }
    triggerElement?.focus();
  }

  function handleInteractOutside(event: Event): void {
    // 控制区内的触发/清空仍回焦本实例，真正的外部操作保留新焦点。
    if (event.target instanceof Node && !controlElement?.contains(event.target)) {
      closedByOutsideInteraction = true;
      outsideFocusTarget = event.target instanceof HTMLElement ? event.target : undefined;
    }
  }

  function handleWindowFocusIn(event: FocusEvent): void {
    if (!open || !(event.target instanceof HTMLElement)) return;
    if (panelElement?.contains(event.target) || controlElement?.contains(event.target)) return;
    closedByOutsideInteraction = true;
    outsideFocusTarget = event.target;
    open = false;
  }

  function handleSearchKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const first = flatVisibleNodes[0];
    if (!first) return;
    event.preventDefault();
    void focusTreeNode(first.node.value);
  }

  function handleTreeKeydown(event: KeyboardEvent, node: TreeSelectOption, expanded: boolean): void {
    if (event.target !== event.currentTarget || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const sourceNode = optionMap.get(node.value) ?? node;
    const nodeHasChildren = hasChildren(sourceNode);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (loads.get(node.value)?.retrying) return;
      if (loadErrors.has(node.value) || selectionErrors.has(node.value)) retryChildren(sourceNode, event);
      else void handleSelect(node);
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
      if (disabled || disabledValues.has(sourceNode.value)) return;
      if (searchQuery.trim() && !sourceNode.children) {
        if (lacksLoadCapability(sourceNode)) capabilityErrors.add(sourceNode.value);
        else void ensureChildren(sourceNode);
      }
      else if (!expanded) void toggleExpandAsync(sourceNode);
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
    open = false;
    const next = multiple ? [] : undefined;
    value = next;
    onchange?.(next);
    triggerElement?.focus();
  }

  function removeSingle(val: string | number, event?: MouseEvent | KeyboardEvent) {
    event?.stopPropagation();
    if (disabled) return;
    selectionAttempt = undefined;
    open = false;
    if (multiple) {
      const next = selectedValues.filter((v) => v !== val);
      value = next;
      onchange?.(next);
    }
    triggerElement?.focus();
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
  const renderedNodes = $derived(shouldVirtualize
    ? flatVisibleNodes.slice(virtualStart, virtualEnd)
    : flatVisibleNodes);
  // 当前节点被过滤、折叠或滚出渲染窗口时，仍保留一个有效的 Tab 入口。
  const tabStopValue = $derived(renderedNodes.some(entry => entry.node.value === activeTreeValue)
    ? activeTreeValue
    : renderedNodes[0]?.node.value);

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
  {@const currentNodeId = nodeId(node.value)}
  {@const hasRenderedGroup = recursive && nodeHasChildren && expanded && !!node.children?.length}

  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed">
    <div
      role="treeitem"
      id={currentNodeId}
      tabindex={tabStopValue === node.value ? 0 : -1}
      aria-label={node.label}
      aria-owns={hasRenderedGroup ? `${currentNodeId}-group` : undefined}
      aria-describedby={loadErrors.has(node.value) || selectionErrors.has(node.value) || capabilityErrors.has(node.value) ? `${currentNodeId}-error` : undefined}
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
      onfocus={() => { activeTreeValue = node.value; }}
      onkeydown={(e) => handleTreeKeydown(e, node, expanded)}
    >
      <div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
        {#if nodeHasChildren}
          <button
            type="button"
            tabindex="-1"
            disabled={unavailable}
            aria-label={`${node.label}: ${i18n.t('tree.toggleChildren')}`}
            aria-busy={busy}
            class="svadmin-u-60fbb7713999 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-07389a777c1f svadmin-u-bfa603190748 svadmin-u-8e551981c8d7"
            onclick={(e) => {
              ownerTreeItem(e)?.focus();
              void toggleExpandAsync(node, e);
            }}
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

      {#if loadErrors.has(node.value) || selectionErrors.has(node.value) || capabilityErrors.has(node.value)}
        <span id={`${currentNodeId}-error`} role="alert" class="svadmin-u-bfa603190748">{i18n.t(capabilityErrors.has(node.value) ? 'tree.childrenUnavailable' : selectionErrors.has(node.value) ? 'tree.selectionFailed' : 'tree.loadFailed')}</span>
        {#if !capabilityErrors.has(node.value)}
          <button type="button" aria-label={`${node.label}: ${i18n.t('common.retry')}`}
            tabindex="-1"
            disabled={unavailable}
            title={i18n.t('common.retry')} onclick={(e) => retryChildren(node, e)}>
            <RotateCw class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          </button>
        {/if}
      {/if}

      {#if partial}
        <Minus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-20aaf08a7ed1" />
      {:else if selected}
        <Check class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-20aaf08a7ed1" />
      {/if}
    </div>

    {#if recursive && nodeHasChildren && expanded && node.children}
      <div id={`${currentNodeId}-group`} role="group" class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed">
        {#each node.children as child, index (treeKey(child.value))}
          {@render treeNode(child, level + 1, index + 1, node.children.length)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<svelte:window onfocusin={handleWindowFocusIn} />

<div class={cn('svadmin-u-d89972fe17d6 svadmin-u-6da6a3c3f741', className)} data-testid="tree-select">
  <Popover.Root bind:open>
    <Popover.Trigger id={triggerId} {disabled} class="svadmin-u-6da6a3c3f741">
      {#snippet child({ props })}
        <div bind:this={controlElement}
          data-disabled={disabled || undefined}
          data-invalid={invalid || undefined}
          class={cn(
            'tree-select-control',
            'svadmin-u-60fbb7713999 svadmin-u-968a1e649bad svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-582e6ef4b245 svadmin-u-9c24ab70af61 svadmin-u-674ec2b09890 svadmin-u-608dd26cd5ba svadmin-u-80b9d0ae125f svadmin-u-6b22a22a9752 svadmin-u-5f533b3a7de7 svadmin-u-b29d8adbad2e svadmin-u-2eba0d65d059',
            open && 'svadmin-u-16b1efa5875e svadmin-u-3e1868fc53e2 svadmin-u-0c15f6cff5a0'
          )}
        >
          <button
            {...props}
            type="button"
            bind:this={triggerElement}
            aria-label={ariaLabel?.trim() ? ariaLabel : undefined}
            aria-controls={open ? panelId : undefined}
            aria-describedby={describedby}
            data-invalid={invalid || undefined}
            {disabled}
            class="tree-select-trigger"
          >
            <span class="svadmin-u-2daa8e5e2f2e">
              {selectedLabels.length ? selectedLabels.join(', ') : placeholder ?? i18n.t('field.selectPlaceholder')}
            </span>
          </button>
          <div
            class="tree-select-display svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c"
          >
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
                    <button type="button" tabindex="0"
                      aria-label={i18n.t('tree.removeSelection', { label: opt?.label ?? String(val) })}
                      title={i18n.t('tree.removeSelection', { label: opt?.label ?? String(val) })}
                      class="tree-select-action svadmin-u-51e95020d6f2 svadmin-u-34516836730d"
                      onclick={(e) => removeSingle(val, e)}
                    >
                      <X class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
                    </button>
                  {/if}
                </Badge>
              {/each}
            {:else}
              <span class="svadmin-u-f283ea9bea0e svadmin-u-d4108abe6359 svadmin-u-8ecebc9f80e6">
                {selectedLabels[0] ?? ''}
              </span>
            {/if}
          </div>

          <div
            class="tree-select-display svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-012fbd121f37 svadmin-u-f58b02572ab2 svadmin-u-bfa603190748"
          >
            {#if allowClear && selectedValues.length > 0 && !disabled}
              <button type="button" tabindex="0"
                aria-label={i18n.t('common.clearSelection')}
                title={i18n.t('common.clearSelection')}
                class="tree-select-action svadmin-u-ea7b2e9e070e svadmin-u-34516836730d svadmin-u-de8350a3bbad"
                onclick={clearAll}
              >
                <X class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
              </button>
            {/if}
            <ChevronsUpDown class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-0b8c506a0596" />
          </div>
        </div>
      {/snippet}
    </Popover.Trigger>

    <Popover.Content id={panelId} role="dialog" aria-labelledby={triggerId}
      onOpenAutoFocus={handleOpenAutoFocus} onCloseAutoFocus={handleCloseAutoFocus}
      onInteractOutside={handleInteractOutside}
      class="svadmin-u-4827635fb99f svadmin-u-cbc20887874e svadmin-u-7b17becb34a1 svadmin-u-7660b450905a" align="start">
      {#snippet child({ props, wrapperProps })}
      <div {...wrapperProps}>
      <div {...props} id={panelId} bind:this={panelElement}>
      {#if searchable}
        <div class="svadmin-u-d89972fe17d6 svadmin-u-a77ed4d908c0">
          <Search class="svadmin-u-da4dbfbc4fdc svadmin-u-ecfeb742a3f3 svadmin-u-7a470f4c9b28 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-bfa603190748" />
          <Input
            type="text"
            bind:ref={searchElement}
            bind:value={searchQuery}
            aria-label={i18n.t('common.search')}
            aria-controls={treeId}
            onkeydown={handleSearchKeydown}
            placeholder={i18n.t('common.search', undefined) ?? '搜索...'}
            class="svadmin-u-ed8a5df7b2fb svadmin-u-e4af885410fe svadmin-u-aa2c13a5e1b4 svadmin-u-359090c2d529"
          />
        </div>
      {/if}

      <div
        bind:this={treeRoot}
        id={treeId}
        role="tree"
        tabindex="-1"
        aria-label={ariaLabel ?? placeholder ?? i18n.t('field.selectPlaceholder')}
        aria-multiselectable={multiple ? 'true' : undefined}
        class="svadmin-u-67d7e383dca6 svadmin-u-92bf82f493b1 svadmin-u-e2eedc5718f0 svadmin-u-eda955402ba6"
        style={shouldVirtualize ? `height:${windowHeight}px;max-height:${windowHeight}px;overflow-y:auto;padding:0;` : undefined}
        onscroll={(event) => { treeScrollTop = event.currentTarget.scrollTop; }}
      >
        {#if shouldVirtualize}
          <div style={`height:${totalHeight}px;position:relative;`}>
            <div style={`position:absolute;top:${virtualStart * rowHeight}px;left:0;right:0;`}>
              {#each renderedNodes as entry (treeKey(entry.node.value))}
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
      </div>
      </div>
      {/snippet}
    </Popover.Content>
  </Popover.Root>
</div>

<style>
  .tree-select-control {
    position: relative;
    isolation: isolate;
    min-inline-size: 0;
  }
  .tree-select-trigger {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: inherit;
    background: transparent;
    cursor: pointer;
  }
  .tree-select-trigger:focus-visible,
  .tree-select-action:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
  .tree-select-control[data-disabled] {
    opacity: 0.5;
  }
  .tree-select-trigger:disabled {
    cursor: not-allowed;
  }
  .tree-select-display {
    position: relative;
    z-index: 1;
    pointer-events: none;
    min-inline-size: 0;
  }
  .tree-select-action {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
</style>
