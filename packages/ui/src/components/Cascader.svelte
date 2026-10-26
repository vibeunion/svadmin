<script lang="ts">
  import { ChevronRight, Check, X, ChevronsUpDown } from '@lucide/svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import { onDestroy, tick, untrack } from 'svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import * as Popover from './ui/popover/index.js';
  import { useTranslation } from '@svadmin/core/i18n';

  export interface CascaderOption {
    value: string | number;
    label: string;
    children?: CascaderOption[];
    hasChildren?: boolean;
    disabled?: boolean;
    isLeaf?: boolean;
  }

  const i18n = useTranslation();

  interface Props {
    id?: string;
    ariaLabel?: string;
    describedby?: string;
    invalid?: boolean;
    options?: CascaderOption[];
    value?: (string | number)[];
    separator?: string;
    placeholder?: string;
    changeOnSelect?: boolean;
    disabled?: boolean;
    allowClear?: boolean;
    loadChildren?: (node: CascaderOption) => Promise<CascaderOption[]>;
    class?: string;
    onchange?: (value: (string | number)[] | undefined, selectedOptions: CascaderOption[]) => void;
  }

  let {
    id,
    ariaLabel,
    describedby,
    invalid = false,
    options = $bindable([]),
    value = $bindable(undefined),
    separator = ' / ',
    placeholder,
    changeOnSelect = false,
    disabled = false,
    allowClear = true,
    loadChildren,
    class: className,
    onchange,
  }: Props = $props();

  const instanceId = $props.id();
  const triggerId = $derived(id ?? `${instanceId}-trigger`);
  const panelId = $derived(`${triggerId}-panel`);
  let open = $state(false);
  let triggerElement = $state<HTMLButtonElement>();
  let panelElement = $state<HTMLDivElement>();
  // Active selected path while navigating panels
  let activePath = $state<(string | number)[]>([]);
  interface ChildLoad {
    node: CascaderOption;
    path: (string | number)[];
    loader: Props['loadChildren'];
    treeEpoch: number;
    promise: Promise<boolean>;
  }
  const loads = new SvelteMap<string, ChildLoad>();
  let loadingValues = new SvelteSet<string>();
  let loadErrors = new SvelteMap<string, ChildLoad>();
  let mounted = true;
  let treeEpoch = 0;
  // 只缓存实际加载结果，按完整路径隔离；不改写宿主 options，也不附加任何标记。
  interface LoadedChildren {
    node: CascaderOption;
    children: CascaderOption[];
  }
  const loadedChildren = new SvelteMap<string, LoadedChildren>();
  let observedOptions = untrack(() => options);
  let observedLoader = untrack(() => loadChildren);
  // 用户焦点意图版本：延迟恢复只能在仍属于原操作时执行。
  let focusSeq = 0;
  let restoringFocus = false;
  // 加载态替换当前聚焦的 Retry 会移除焦点锚点，浏览器随后的布局内 focusin
  // 不是用户切换分支；仅忽略该次焦点迁移，仍由原重试操作恢复焦点。
  let displacedFocusElement: HTMLElement | null = null;
  onDestroy(() => { mounted = false; loads.clear(); });

  // hasChildren 只表达“是否应展开子列”，不保证 children 已存在（异步懒加载）。
  function hasChildren(option: CascaderOption | undefined): boolean {
    if (!option || option.isLeaf) return false;
    if (option.hasChildren !== undefined) return option.hasChildren;
    return Boolean(option.children && option.children.length > 0);
  }

  // 路径身份：不同父级下允许出现相同 value，加载状态必须按完整路径隔离。
  function pathId(path: (string | number)[]): string {
    return JSON.stringify(path);
  }

  function isNodeUnavailable(node: CascaderOption, path: (string | number)[]): boolean {
    if (disabled || node.disabled === true) return true;
    const ancestors = getOptionsForPath(path.slice(0, -1));
    return ancestors.length !== path.length - 1 || ancestors.some(ancestor => ancestor.disabled);
  }

  // 在宿主实时树上叠加实际加载结果；宿主补齐/替换 children、改为 isLeaf
  // 或替换节点对象后，旧缓存立即失效。不同路径的条目各自独立，不会互相覆盖。
  function mergeLoadedChildren(nodes: CascaderOption[], prefix: (string | number)[]): CascaderOption[] {
    let changed = false;
    const next = nodes.map((node) => {
      const path = [...prefix, node.value];
      const entry = loadedChildren.get(pathId(path));
      const applyLoaded = node.children === undefined && node.isLeaf !== true
        && !!entry && entry.node === node;
      const children = applyLoaded ? entry.children : node.children;
      const mergedChildren = children ? mergeLoadedChildren(children, path) : undefined;
      if (children === node.children && mergedChildren === children) return node;
      changed = true;
      const { children: _nodeChildren, ...nodeWithoutChildren } = node;
      return {
        ...nodeWithoutChildren,
        ...(mergedChildren !== undefined ? { children: mergedChildren } : {}),
        ...(applyLoaded && entry ? { hasChildren: entry.children.length > 0 } : {}),
      };
    });
    return changed ? next : nodes;
  }

  // 每次读取都从宿主当前对象重建，避免克隆祖先形成旧快照。
  const effectiveOptions = $derived(mergeLoadedChildren(options, []));

  // 外部替换选项或加载器、禁用字段时，旧请求不得再写入或提交。
  $effect.pre(() => {
    if (options !== observedOptions) {
      // 宿主替换 options 一定推进树版本；内部子级缓存随之失效。
      observedOptions = options;
      loadedChildren.clear();
      treeEpoch += 1;
    }
    const loader = loadChildren;
    const unavailable = disabled;
    if (loader !== observedLoader || unavailable) {
      observedLoader = loader;
    }
    for (const [key, request] of loads) {
      const resolvedPath = getOptionsForPath(request.path);
      const current = resolvedPath.at(-1);
      if (unavailable || request.treeEpoch !== treeEpoch || loader !== request.loader
        || resolvedPath.length !== request.path.length
        || !current || current !== request.node || isNodeUnavailable(current, request.path)) {
        loads.delete(key);
        loadingValues.delete(key);
        loadErrors.delete(key);
      }
    }
    for (const [key, request] of loadErrors) {
      const resolvedPath = getOptionsForPath(request.path);
      const current = resolvedPath.at(-1);
      if (unavailable || request.treeEpoch !== treeEpoch || loader !== request.loader
        || resolvedPath.length !== request.path.length
        || !current || current !== request.node || isNodeUnavailable(current, request.path)
        || !hasChildren(current) || current.children) loadErrors.delete(key);
    }
  });

  async function ensureChildren(node: CascaderOption, path: (string | number)[]): Promise<boolean> {
    const key = pathId(path);
    if (!mounted || isNodeUnavailable(node, path)) return false;
    if (node.children) return true;
    if (!hasChildren(node)) return true;
    const existing = loads.get(key);
    if (existing) return existing.promise;
    const loader = loadChildren;
    if (!loader) {
      loadErrors.set(key, { node, path, loader, treeEpoch, promise: Promise.resolve(false) });
      return false;
    }
    const request: ChildLoad = { node, path, loader, treeEpoch, promise: Promise.resolve(false) };
    loads.set(key, request);
    const current = () => {
      if (!mounted || disabled || loads.get(key) !== request
        || treeEpoch !== request.treeEpoch || loadChildren !== request.loader) return false;
      const resolvedPath = getOptionsForPath(path);
      const currentNode = resolvedPath.at(-1);
      // 请求期间路径节点被替换、变成叶子或由宿主补齐 children，都属于新所有权。
      return resolvedPath.length === path.length
        && !!currentNode
        && currentNode === request.node
        && currentNode.children === undefined
        && currentNode.isLeaf !== true
        && !isNodeUnavailable(currentNode, path);
    };
    loadingValues.add(key);
    loadErrors.delete(key);
    request.promise = (async () => {
      try {
        const children = await loader(request.node);
        if (!current()) return false;
        loadedChildren.set(key, { node: request.node, children });
        return true;
      } catch {
        if (current()) loadErrors.set(key, request);
        return false;
      } finally {
        if (loads.get(key) === request) {
          loads.delete(key);
          loadingValues.delete(key);
        }
      }
    })();
    return request.promise;
  }

  function samePath(left: (string | number)[], right: (string | number)[]): boolean {
    return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  }

  async function activateOption(colIndex: number, option: CascaderOption, commitSelection: boolean): Promise<{ loaded: boolean; path: (string | number)[] }> {
    if (isOptionDisabled(colIndex, option)) return { loaded: false, path: activePath };
    const nextPath = [...activePath.slice(0, colIndex), option.value];
    activePath = nextPath;
    const loaded = await ensureChildren(option, nextPath);
    if (!loaded || !open || !samePath(activePath, nextPath)) return { loaded: false, path: nextPath };
    const currentOption = getOptionsForPath(nextPath).at(-1);
    if (!currentOption || isOptionDisabled(colIndex, currentOption)) return { loaded: false, path: nextPath };
    const currentHasChildren = hasChildren(currentOption);
    if (commitSelection && (!currentHasChildren || changeOnSelect)) {
      // 同一异步分支在请求期间被重复激活时，只有第一次可以提交。
      if (!value || !samePath(value, nextPath)) {
        value = nextPath;
        onchange?.(nextPath, getOptionsForPath(nextPath));
      }
    }
    if (commitSelection && !currentHasChildren) open = false;
    return { loaded: true, path: nextPath };
  }

  $effect(() => {
    if (value && Array.isArray(value)) {
      activePath = [...value];
    } else {
      activePath = [];
    }
  });

  // Calculate columns based on activePath
  const columns = $derived.by<CascaderOption[][]>(() => {
    const cols: CascaderOption[][] = [effectiveOptions];
    let currentOptions = effectiveOptions;

    for (const val of activePath) {
      const selectedOpt = currentOptions.find((o) => o.value === val);
      if (!selectedOpt || !hasChildren(selectedOpt)) break;
      cols.push(selectedOpt.children ?? []);
      if (!selectedOpt.children) break;
      currentOptions = selectedOpt.children;
    }

    return cols;
  });

  // Selected options objects corresponding to value
  const selectedOptions = $derived.by<CascaderOption[]>(() => {
    if (!value || !Array.isArray(value) || value.length === 0) return [];
    const opts: CascaderOption[] = [];
    let currentLevel = effectiveOptions;

    for (const val of value) {
      const found = currentLevel.find((o) => o.value === val);
      if (found) {
        opts.push(found);
        if (!hasChildren(found) || !found.children) break;
        currentLevel = found.children;
      } else {
        break;
      }
    }
    return opts;
  });

  const displayLabel = $derived.by(() => {
    if (selectedOptions.length === 0) return '';
    return selectedOptions.map((o) => o.label).join(separator);
  });

  async function handleSelectOption(colIndex: number, option: CascaderOption): Promise<void> {
    focusSeq += 1;
    await activateOption(colIndex, option, true);
  }

  function getOptionsForPath(path: (string | number)[]): CascaderOption[] {
    const result: CascaderOption[] = [];
    let currentLevel = effectiveOptions;
    for (const val of path) {
      const found = currentLevel.find((o) => o.value === val);
      if (found) {
        result.push(found);
        if (!hasChildren(found) || !found.children) break;
        currentLevel = found.children;
      } else break;
    }
    return result;
  }

  function isOptionDisabled(colIndex: number, option: CascaderOption): boolean {
    const ancestors = getOptionsForPath(activePath.slice(0, colIndex));
    return disabled || option.disabled === true || ancestors.length !== colIndex
      || ancestors.some(ancestor => ancestor.disabled);
  }

  function columnParent(colIndex: number): CascaderOption | undefined {
    if (colIndex === 0) return undefined;
    return getOptionsForPath(activePath.slice(0, colIndex)).at(-1);
  }

  async function retryColumn(colIndex: number, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    const retryElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    focusSeq += 1;
    const intent = focusSeq;
    const parentPath = activePath.slice(0, colIndex);
    const parent = getOptionsForPath(parentPath).at(-1);
    if (!parent || disabled) return;
    displacedFocusElement = retryElement && document.activeElement === retryElement ? retryElement : null;
    const loaded = await ensureChildren(parent, parentPath);
    if (displacedFocusElement === retryElement) displacedFocusElement = null;
    if (!loaded || !open || intent !== focusSeq) return;
    await tick();
    if (intent !== focusSeq || !open || !samePath(activePath.slice(0, colIndex), parentPath)) return;
    focusColumnButton(colIndex);
  }

  function clearAll(event: MouseEvent) {
    event?.stopPropagation();
    if (disabled) return;
    open = false;
    triggerElement?.focus();
    value = undefined;
    activePath = [];
    onchange?.(undefined, []);
  }

  function focusColumnButton(columnIndex: number, optionIndex?: number): void {
    if (!open || disabled) return;
    const column = panelElement?.querySelector<HTMLElement>(`[data-cascader-column="${columnIndex}"]`);
    if (!column) return;
    const buttons = [...column.querySelectorAll<HTMLButtonElement>('button')];
    const start = optionIndex ?? 0;
    const indexes = optionIndex === undefined
      ? buttons.map((_, index) => index)
      : [start, ...buttons.map((_, index) => index).filter(index => index !== start)];
    const target = indexes.map(index => buttons[index]).find(button => button && !button.disabled);
    if (!target) return;
    restoringFocus = true;
    try { target.focus(); } finally { restoringFocus = false; }
  }

  function handlePanelFocusIn(): void {
    // 用户把焦点移到其他分支或同级按钮后，旧的延迟恢复不再拥有焦点。
    if (restoringFocus) return;
    if (displacedFocusElement && !displacedFocusElement.isConnected) {
      displacedFocusElement = null;
      return;
    }
    displacedFocusElement = null;
    focusSeq += 1;
  }

  async function handleOpenAutoFocus(event: Event): Promise<void> {
    // 避免上游延迟自动聚焦覆盖用户已经完成的列间导航。
    event.preventDefault();
    await tick();
    if (!open || !panelElement || panelElement.contains(document.activeElement)) return;
    focusColumnButton(0);
    if (!panelElement.contains(document.activeElement)) panelElement.focus();
  }

  async function handleCloseAutoFocus(event: Event): Promise<void> {
    // 重挂载会重置上游焦点记忆；待状态刷新后仅在真实关闭时回焦。
    event.preventDefault();
    await tick();
    if (!open) triggerElement?.focus();
  }

  async function handleOptionKeydown(event: KeyboardEvent, colIndex: number, option: CascaderOption): Promise<void> {
    const column = event.currentTarget as HTMLButtonElement;
    if (!open || isOptionDisabled(colIndex, option) || column.disabled
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    focusSeq += 1;
    const intent = focusSeq;
    const buttons = [...(column.parentElement?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const currentIndex = buttons.indexOf(column);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const direction = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
      const enabled = buttons.map((button, index) => ({ button, index })).filter(({ button }) => !button.disabled);
      if (enabled.length === 0) return;
      const currentEnabledIndex = enabled.findIndex(({ index }) => index === currentIndex);
      const next = event.key === 'Home'
        ? enabled[0]
        : event.key === 'End'
          ? enabled.at(-1)
          : enabled[(currentEnabledIndex + direction + enabled.length) % enabled.length];
      next?.button.focus();
      return;
    }

    if (event.key === 'ArrowRight') {
      if (!hasChildren(option)) return;
      event.preventDefault();
      const result = await activateOption(colIndex, option, false);
      if (intent !== focusSeq || !open || !samePath(activePath, result.path)) return;
      await tick();
      if (intent !== focusSeq || !open || !samePath(activePath, result.path)) return;
      focusColumnButton(colIndex + 1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (colIndex === 0) {
        open = false;
        await tick();
        triggerElement?.focus();
        return;
      }
      const parentPath = activePath.slice(0, colIndex - 1);
      const parentOptions = getOptionsForPath(parentPath).at(-1)?.children ?? effectiveOptions;
      const parentIndex = parentOptions.findIndex(parent => Object.is(parent.value, activePath[colIndex - 1]));
      focusColumnButton(colIndex - 1, parentIndex);
      activePath = parentPath;
    }
  }

  $effect(() => {
    // 打开/关闭都开启新的焦点意图，关闭再重开的旧完成不得抢焦点。
    open;
    focusSeq += 1;
  });
</script>

<div class={cn('svadmin-u-d89972fe17d6 svadmin-u-6da6a3c3f741', className)} data-testid="cascader">
  <Popover.Root bind:open>
    <div class="cascader-control">
    <Popover.Trigger id={triggerId} {disabled} class="svadmin-u-6da6a3c3f741">
      {#snippet child({ props })}
        <button
          type="button"
          {...props}
          aria-label={ariaLabel}
          aria-controls={open ? panelId : undefined}
          aria-describedby={describedby}
          data-invalid={invalid || undefined}
          bind:this={triggerElement}
          {disabled}
          class={cn(
            'svadmin-u-60fbb7713999 svadmin-u-968a1e649bad svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-582e6ef4b245 svadmin-u-9c24ab70af61 svadmin-u-674ec2b09890 svadmin-u-608dd26cd5ba svadmin-u-80b9d0ae125f svadmin-u-6b22a22a9752 svadmin-u-5f533b3a7de7 svadmin-u-b29d8adbad2e svadmin-u-2eba0d65d059',
            open && 'svadmin-u-16b1efa5875e svadmin-u-3e1868fc53e2 svadmin-u-0c15f6cff5a0'
          )}
        >
          <span class={cn('svadmin-u-f283ea9bea0e', displayLabel ? 'svadmin-u-d4108abe6359' : 'svadmin-u-bfa603190748')}>
            {displayLabel || (placeholder ?? (i18n.t('field.selectPlaceholder', undefined) ?? '请选择...'))}
          </span>

          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-012fbd121f37 svadmin-u-f58b02572ab2 svadmin-u-bfa603190748">
            <ChevronsUpDown class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-0b8c506a0596" />
          </div>
        </button>
      {/snippet}
    </Popover.Trigger>
    {#if allowClear && displayLabel && !disabled}
      <Button type="button" variant="ghost" size="icon-sm"
        aria-label={i18n.t('common.clearSelection')} title={i18n.t('common.clearSelection')} onclick={clearAll}>
        <X class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>
    {/if}
    </div>

    <Popover.Content id={panelId} role="dialog" aria-labelledby={triggerId}
      onOpenAutoFocus={handleOpenAutoFocus} onCloseAutoFocus={handleCloseAutoFocus}
      class="svadmin-cascader-panel svadmin-u-23e1f628d033 svadmin-u-68fe531347b9 svadmin-u-8a539c7fe216 svadmin-u-06bbb43166db svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af" align="start">
      {#snippet child({ props, wrapperProps })}
      <div {...wrapperProps}>
      <div {...props} id={panelId} bind:this={panelElement} onfocusin={handlePanelFocusIn}>
      <div class="svadmin-u-60fbb7713999 svadmin-u-3746131ec018 svadmin-u-e783642739e3 svadmin-u-8aee2b07b47d svadmin-u-1384f66f41d0">
        {#each columns as columnOptions, colIndex (colIndex)}
          <div data-cascader-column={colIndex} class="svadmin-u-84789e8a20cd svadmin-u-1734f23deafe svadmin-u-8aee2b07b47d svadmin-u-92bf82f493b1 svadmin-u-eb6a3cef9686 svadmin-u-e2eedc5718f0">
            {#each columnOptions as option (option.value)}
              {@const isSelectedInPath = activePath[colIndex] === option.value}
              {@const optionHasChildren = hasChildren(option)}
              {@const unavailable = isOptionDisabled(colIndex, option)}
              <button
                type="button"
                disabled={unavailable}
                class={cn(
                  'svadmin-u-60fbb7713999 svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-421ac2be5045 svadmin-u-0b91436debbd svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-2eba0d65d059 svadmin-u-ceb69a6b0e5f',
                  isSelectedInPath
                    ? 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069'
                    : 'svadmin-u-68646cdcc246 svadmin-u-d4108abe6359',
                  unavailable && 'svadmin-u-0b8c506a0596 svadmin-u-29b733e4c162 svadmin-u-a4326536b8f5'
                )}
                onclick={() => handleSelectOption(colIndex, option)}
                onkeydown={(event) => handleOptionKeydown(event, colIndex, option)}
              >
                <span class="svadmin-u-f283ea9bea0e svadmin-u-36e579c0b41c">{option.label}</span>
                {#if optionHasChildren}
                  <ChevronRight class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-f2868c227fcd svadmin-u-f58b02572ab2" />
                {:else if isSelectedInPath && value && value[colIndex] === option.value}
                  <Check class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-012fbd121f37 svadmin-u-20aaf08a7ed1 svadmin-u-f58b02572ab2" />
                {/if}
              </button>
            {:else}
              {@const parent = columnParent(colIndex)}
              {@const parentKey = pathId(activePath.slice(0, colIndex))}
              {#if parent && loadingValues.has(parentKey)}
                <div role="status" class="svadmin-u-cb11fec3bb46 svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
                  {i18n.t('common.loading', undefined) ?? '加载中...'}
                </div>
              {:else if parent && loadErrors.has(parentKey)}
                <div role="alert" class="svadmin-u-cb11fec3bb46 svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
                  <span>{i18n.t('tree.loadFailed', undefined) ?? '子节点加载失败'}</span>
                  {#if loadChildren}
                    <Button type="button" variant="ghost" size="sm"
                      onclick={(event) => retryColumn(colIndex, event)}>
                      {i18n.t('common.retry', undefined) ?? '重试'}
                    </Button>
                  {/if}
                </div>
              {:else}
                <div class="svadmin-u-cb11fec3bb46 svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
                  {i18n.t('common.noData', undefined) ?? '无数据'}
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
      </div>
      </div>
      {/snippet}
    </Popover.Content>
  </Popover.Root>
</div>

<style>
  .cascader-control {
    display: flex;
    align-items: center;
    gap: 4px;
    min-inline-size: 0;
  }
  .cascader-control > :global(button[data-popover-trigger]) {
    flex: 1;
    min-inline-size: 0;
  }
  :global(.svadmin-cascader-panel) {
    max-inline-size: calc(100vw - 32px);
  }
</style>
