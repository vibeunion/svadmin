<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import { SvelteSet } from 'svelte/reactivity';
  import { onDestroy } from 'svelte';
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
    class: className,
    onchange,
  }: Props = $props();

  let open = $state(false);
  let searchQuery = $state('');
  let loadingValues = new SvelteSet<string | number>();
  let loadErrors = new SvelteSet<string | number>();
  let expandedNodes = new SvelteSet<string | number>();
  let mounted = true;
  const loads = new Map<string | number, {
    node: TreeSelectOption;
    loader: NonNullable<Props['loadChildren']>;
  }>();
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

  // Selected values array normalized
  const selectedValues = $derived.by< (string | number)[]>(() => {
    if (value === undefined || value === null || value === '') return [];
    return Array.isArray(value) ? value : [value];
  });

  const selectedLabels = $derived.by(() => {
    return selectedValues.map((v) => optionMap.get(v)?.label ?? String(v));
  });

  $effect.pre(() => {
    const nodes = optionMap;
    const loader = loadChildren;
    const unavailable = disabled;
    for (const [key, request] of loads) {
      if (unavailable || nodes.get(key) !== request.node || loader !== request.loader) {
        loads.delete(key);
        loadingValues.delete(key);
        loadErrors.delete(key);
      }
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
    if (!hasChildren(node)) return node.disabled ? [] : [node];
    if (!node.children) return [];
    return (node.children ?? []).flatMap(selectableLeaves);
  }

  function isSelected(val: string | number): boolean {
    return selectedValues.includes(val);
  }

  function isNodeSelected(node: TreeSelectOption): boolean {
    if (!multiple || !hasChildren(node)) return isSelected(node.value);
    const leaves = selectableLeaves(node);
    return leaves.length > 0 && leaves.every((leaf) => isSelected(leaf.value));
  }

  function isPartiallySelected(node: TreeSelectOption): boolean {
    if (!multiple || !hasChildren(node)) return false;
    const leaves = selectableLeaves(node);
    const count = leaves.filter((leaf) => isSelected(leaf.value)).length;
    return count > 0 && count < leaves.length;
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
    if (!mounted || disabled || loadingValues.has(node.value)) return false;
    if (!node.hasChildren || node.children) return true;
    const currentNode = optionMap.get(node.value);
    if (!loadChildren || !currentNode) return false;
    const request = { node: currentNode, loader: loadChildren };
    loads.set(node.value, request);
    const current = () => mounted && !disabled && loads.get(node.value) === request
      && optionMap.get(node.value) === request.node && loadChildren === request.loader;
    loadingValues.add(node.value);
    loadErrors.delete(node.value);
    try {
      const children = await request.loader(request.node);
      if (!current()) return false;
      options = updateOptionsChildren(options, node.value, children);
      return true;
    } catch {
      if (current()) loadErrors.add(node.value);
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
    void toggleExpandAsync(node);
  }

  function setMultipleSelection(node: TreeSelectOption): void {
    const leaves = selectableLeaves(node);
    const leafValues = new Set(leaves.map((leaf) => leaf.value));
    const shouldRemove = leaves.length > 0 && leaves.every((leaf) => isSelected(leaf.value));
    const next = shouldRemove
      ? selectedValues.filter((value) => !leafValues.has(value))
      : [...selectedValues, ...leaves.map((leaf) => leaf.value).filter((value) => !isSelected(value))];
    value = next;
    onchange?.(next);
  }

  async function handleSelect(node: TreeSelectOption): Promise<void> {
    if (node.disabled) return;
    const nodeHasChildren = hasChildren(node);
    if (onlyLeafSelectable && nodeHasChildren) {
      await toggleExpandAsync(node);
      return;
    }

    if (multiple) {
      if (nodeHasChildren) setMultipleSelection(node);
      else {
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

  function focusTreeNode(valueToFocus: string | number): void {
    const element = document.querySelector<HTMLElement>(`[data-tree-value="${CSS.escape(String(valueToFocus))}"]`);
    element?.focus();
  }

  function focusSibling(nodeValue: string | number, offset: number): void {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-tree-value]'));
    const index = nodes.findIndex((node) => node.dataset['treeValue'] === String(nodeValue));
    const target = nodes[index + offset];
    target?.focus();
  }

  function handleTreeKeydown(event: KeyboardEvent, node: TreeSelectOption, expanded: boolean): void {
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
      document.querySelector<HTMLElement>('[data-tree-value]')?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      const nodes = document.querySelectorAll<HTMLElement>('[data-tree-value]');
      nodes[nodes.length - 1]?.focus();
    } else if (event.key === 'ArrowRight' && nodeHasChildren) {
      event.preventDefault();
      if (!expanded) void toggleExpandAsync(node);
      else focusTreeNode(node.children?.[0]?.value ?? node.value);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (nodeHasChildren && expanded) toggleExpand(node.value);
      else {
        const parent = findParent(options, node.value);
        if (parent) focusTreeNode(parent.value);
      }
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
        filtered.push(definedOptions({
          ...node,
          children: filteredChildren ?? node.children,
        }));
      }
    }
    return filtered;
  }

  const visibleOptions = $derived(filterTree(options, searchQuery));
</script>

{#snippet treeNode(node: TreeSelectOption, level: number)}
  {@const nodeHasChildren = hasChildren(node)}
  {@const expanded = isNodeExpanded(node)}
  {@const selected = isNodeSelected(node)}
  {@const partial = isPartiallySelected(node)}
  {@const selectable = !node.disabled && (!onlyLeafSelectable || !nodeHasChildren)}

  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed">
    <div
      role="treeitem"
      tabindex="0"
      aria-selected={selected}
      aria-checked={multiple ? (partial ? 'mixed' : selected) : undefined}
      aria-level={level + 1}
      aria-expanded={nodeHasChildren ? expanded : undefined}
      data-tree-value={String(node.value)}
      class={cn(
        'group svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-58284b4ea568 svadmin-u-421ac2be5045 svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-7f6912283f11',
        selected ? 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069' : 'svadmin-u-68646cdcc246 svadmin-u-d4108abe6359',
        node.disabled && 'svadmin-u-0b8c506a0596 svadmin-u-29b733e4c162 svadmin-u-a4326536b8f5'
      )}
      style="padding-left: {level * 16 + 8}px;"
      onclick={() => {
        if (selectable) handleSelect(node);
      }}
      onkeydown={(e) => handleTreeKeydown(e, node, expanded)}
    >
      <div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
        {#if nodeHasChildren}
          <button
            type="button"
            aria-label={`${node.label}: ${i18n.t('tree.toggleChildren')}`}
            aria-busy={loadingValues.has(node.value)}
            class="svadmin-u-60fbb7713999 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-07389a777c1f svadmin-u-bfa603190748 svadmin-u-8e551981c8d7"
            onclick={(e) => void toggleExpandAsync(node, e)}
          >
            {#if loadingValues.has(node.value)}
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

      {#if loadErrors.has(node.value)}
        <span role="alert" class="svadmin-u-bfa603190748">{i18n.t('tree.loadFailed')}</span>
        <button type="button" aria-label={`${node.label}: ${i18n.t('common.retry')}`}
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

    {#if nodeHasChildren && expanded && node.children}
      <div role="group" class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed">
        {#each node.children as child (child.value)}
          {@render treeNode(child, level + 1)}
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
                      class="svadmin-u-51e95020d6f2 svadmin-u-34516836730d"
                      onclick={(e) => removeSingle(val, e)}
                      onkeydown={(e) => {
                        if (e.key === 'Enter') removeSingle(val, e as never);
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
                class="svadmin-u-ea7b2e9e070e svadmin-u-34516836730d svadmin-u-de8350a3bbad"
                onclick={clearAll}
                onkeydown={(e) => {
                  if (e.key === 'Enter') clearAll(e as never);
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

      <div role="tree" class="svadmin-u-67d7e383dca6 svadmin-u-92bf82f493b1 svadmin-u-e2eedc5718f0 svadmin-u-eda955402ba6">
        {#each visibleOptions as rootNode (rootNode.value)}
          {@render treeNode(rootNode, 0)}
        {:else}
          <div class="svadmin-u-940911bf310c svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
            {i18n.t('common.noData', undefined) ?? '无匹配选项'}
          </div>
        {/each}
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
