<script lang="ts">
  import { ChevronRight, ChevronDown, Copy, Check, Search } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface JsonViewerProps {
    /** 待解析展示的数据，可为对象、数组或合法的 JSON 字符串 */
    data: unknown;
    /** 初始展开深度，默认 2 */
    initialDepth?: number | undefined;
    /** 是否显示一键复制完整 JSON 按钮，默认 true */
    copyable?: boolean | undefined;
    /** 是否显示关键词搜索过滤栏，默认 true */
    searchable?: boolean | undefined;
    /** 字体大小：'sm' | 'md'，默认 'sm' */
    size?: 'sm' | 'md' | undefined;
    /** 自定义最大高度类名，如 'max-h-96' */
    maxHeight?: string | undefined;
    /** 复制指定属性路径时的回调 */
    onCopyPath?: ((path: string, value: unknown) => void) | undefined;
    class?: string | undefined;
  }

  let {
    data,
    initialDepth = 2,
    copyable = true,
    searchable = true,
    size = 'sm',
    maxHeight = 'max-h-[32rem]',
    onCopyPath,
    class: className = '',
  }: JsonViewerProps = $props();

  let searchQuery = $state('');
  let copiedAll = $state(false);
  let copiedPath = $state<string | null>(null);
  let collapsedPaths = $state<Set<string>>(new Set());

  // 解析并规范化根对象
  const parsedData = $derived.by(() => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  });

  const fullJsonString = $derived.by(() => {
    try {
      return JSON.stringify(parsedData, null, 2);
    } catch {
      return String(parsedData);
    }
  });

  function isObject(val: unknown): val is Record<string, unknown> {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  function isArray(val: unknown): val is unknown[] {
    return Array.isArray(val);
  }

  function isPathCollapsed(path: string, depth: number): boolean {
    if (collapsedPaths.has(path)) return true;
    // 如果没有被显式收起，且层级超过初始深度，则默认收起
    return depth > initialDepth && !collapsedPaths.has(`expanded:${path}`);
  }

  function handleToggle(path: string, depth: number) {
    const isCurrentlyCollapsed = isPathCollapsed(path, depth);
    const next = new Set(collapsedPaths);
    if (isCurrentlyCollapsed) {
      next.delete(path);
      next.add(`expanded:${path}`);
    } else {
      next.add(path);
      next.delete(`expanded:${path}`);
    }
    collapsedPaths = next;
  }

  function copyAll() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullJsonString);
      copiedAll = true;
      setTimeout(() => {
        copiedAll = false;
      }, 1800);
    }
  }

  function copySinglePath(path: string, value: unknown) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(path);
      copiedPath = path;
      onCopyPath?.(path, value);
      setTimeout(() => {
        if (copiedPath === path) copiedPath = null;
      }, 1500);
    }
  }

  function matchesSearch(key: string, val: unknown): boolean {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (key.toLowerCase().includes(q)) return true;
    if (typeof val === 'string' && val.toLowerCase().includes(q)) return true;
    if (typeof val === 'number' && String(val).includes(q)) return true;
    return false;
  }
</script>

<div
  data-svadmin-component="JsonViewer"
  class={cn(
    'rounded-md border border-border bg-card shadow-xs flex flex-col font-mono text-xs overflow-hidden',
    className
  )}
>
  <!-- Top Toolbar -->
  <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/70 bg-muted/30">
    <div class="flex items-center gap-2 flex-1 max-w-sm">
      {#if searchable}
        <div class="relative w-full flex items-center">
          <Search class="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="搜索 Key 或 Value…"
            class="w-full pl-8 pr-2.5 py-1 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-2 focus:outline-primary"
          />
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-1.5 shrink-0">
      {#if copyable}
        <button
          type="button"
          onclick={copyAll}
          class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-sans border border-border bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="复制完整 JSON"
        >
          {#if copiedAll}
            <Check class="h-3 w-3 text-success" />
            <span class="text-success text-xs">已复制</span>
          {:else}
            <Copy class="h-3 w-3" />
            <span class="text-xs">复制 JSON</span>
          {/if}
        </button>
      {/if}
    </div>
  </div>

  <!-- JSON Content Tree -->
  <div class={cn('p-3.5 overflow-auto select-text space-y-1', maxHeight, size === 'sm' ? 'text-xs' : 'text-sm')}>
    {#if parsedData === null}
      <span class="text-muted-foreground italic">null</span>
    {:else if typeof parsedData !== 'object'}
      <span class="text-foreground">{String(parsedData)}</span>
    {:else if isArray(parsedData)}
      <!-- Array Root -->
      <div class="space-y-0.5">
        <span class="text-muted-foreground">[</span>
        <div class="pl-4 border-l border-border/40 space-y-1 my-0.5">
          {#each parsedData as item, idx (idx)}
            {@const itemPath = `[${idx}]`}
            {#if matchesSearch(String(idx), item)}
              <div class="flex items-start gap-1 group py-0.5">
                <span class="text-muted-foreground/60 select-none text-xs w-5 text-right">{idx}:</span>
                {#if isObject(item) || isArray(item)}
                  {@const collapsed = isPathCollapsed(itemPath, 1)}
                  <button
                    type="button"
                    onclick={() => handleToggle(itemPath, 1)}
                    class="inline-flex items-center p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Toggle node"
                  >
                    {#if collapsed}
                      <ChevronRight class="h-3 w-3" />
                    {:else}
                      <ChevronDown class="h-3 w-3" />
                    {/if}
                  </button>
                  {#if collapsed}
                    <button
                      type="button"
                      class="text-muted-foreground text-xs cursor-pointer hover:underline bg-transparent border-0 p-0 text-left font-mono"
                      onclick={() => handleToggle(itemPath, 1)}
                    >
                      {isArray(item) ? `Array(${item.length})` : `{...}`}
                    </button>
                  {:else}
                    <div class="flex-1">
                      <div class="text-muted-foreground text-xs">{isArray(item) ? '[' : '{'}</div>
                      <div class="pl-4 border-l border-border/30 my-0.5 space-y-1">
                        {#each Object.entries(item) as [subKey, subVal] (subKey)}
                          <div class="flex items-baseline gap-1 py-0.5">
                            <span class="text-foreground font-semibold">"{subKey}":</span>
                            <span class={cn(
                              typeof subVal === 'string' && 'text-success',
                              typeof subVal === 'number' && 'text-primary font-medium',
                              typeof subVal === 'boolean' && 'text-warning font-medium',
                              subVal === null && 'text-muted-foreground italic'
                            )}>
                              {typeof subVal === 'string' ? `"${subVal}"` : String(subVal)}
                            </span>
                          </div>
                        {/each}
                      </div>
                      <div class="text-muted-foreground text-xs">{isArray(item) ? ']' : '}'}</div>
                    </div>
                  {/if}
                {:else}
                  <span class={cn(
                    typeof item === 'string' && 'text-success',
                    typeof item === 'number' && 'text-primary font-medium',
                    typeof item === 'boolean' && 'text-warning font-medium',
                    item === null && 'text-muted-foreground italic'
                  )}>
                    {typeof item === 'string' ? `"${item}"` : String(item)}
                  </span>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
        <span class="text-muted-foreground">]</span>
      </div>
    {:else if isObject(parsedData)}
      <!-- Object Root -->
      <div class="space-y-0.5">
        <span class="text-muted-foreground">&#123;</span>
        <div class="pl-4 border-l border-border/40 space-y-1 my-0.5">
          {#each Object.entries(parsedData) as [key, val] (key)}
            {@const nodePath = key}
            {#if matchesSearch(key, val)}
              <div class="flex items-start gap-1 group py-0.5 hover:bg-muted/20 rounded px-1 -mx-1">
                {#if isObject(val) || isArray(val)}
                  {@const collapsed = isPathCollapsed(nodePath, 1)}
                  <button
                    type="button"
                    onclick={() => handleToggle(nodePath, 1)}
                    class="inline-flex items-center p-0.5 text-muted-foreground hover:text-foreground cursor-pointer mt-0.5"
                    aria-label={`Toggle ${key}`}
                  >
                    {#if collapsed}
                      <ChevronRight class="h-3 w-3" />
                    {:else}
                      <ChevronDown class="h-3 w-3" />
                    {/if}
                  </button>
                  <span class="text-foreground font-semibold">"{key}":</span>
                  {#if collapsed}
                    <button
                      type="button"
                      class="text-muted-foreground text-xs cursor-pointer hover:underline bg-transparent border-0 p-0 text-left font-mono"
                      onclick={() => handleToggle(nodePath, 1)}
                    >
                      {isArray(val) ? `Array(${val.length})` : `{...}`}
                    </button>
                  {:else}
                    <div class="flex-1">
                      <span class="text-muted-foreground text-xs">{isArray(val) ? '[' : '{'}</span>
                      <div class="pl-4 border-l border-border/30 my-0.5 space-y-1">
                        {#each Object.entries(val) as [subK, subV] (subK)}
                          <div class="flex items-baseline gap-1 py-0.5">
                            <span class="text-foreground/90 font-medium">"{subK}":</span>
                            <span class={cn(
                              typeof subV === 'string' && 'text-success',
                              typeof subV === 'number' && 'text-primary font-medium',
                              typeof subV === 'boolean' && 'text-warning font-medium',
                              subV === null && 'text-muted-foreground italic'
                            )}>
                              {typeof subV === 'string' ? `"${subV}"` : typeof subV === 'object' && subV !== null ? (Array.isArray(subV) ? `Array(${subV.length})` : '{...}') : String(subV)}
                            </span>
                          </div>
                        {/each}
                      </div>
                      <span class="text-muted-foreground text-xs">{isArray(val) ? ']' : '}'}</span>
                    </div>
                  {/if}
                {:else}
                  <div class="flex items-baseline gap-1 flex-1">
                    <span class="text-foreground font-semibold">"{key}":</span>
                    <span class={cn(
                      typeof val === 'string' && 'text-success',
                      typeof val === 'number' && 'text-primary font-medium',
                      typeof val === 'boolean' && 'text-warning font-medium',
                      val === null && 'text-muted-foreground italic'
                    )}>
                      {typeof val === 'string' ? `"${val}"` : String(val)}
                    </span>
                  </div>
                {/if}

                <!-- Quick Path Copy Button on Hover -->
                <button
                  type="button"
                  onclick={() => copySinglePath(nodePath, val)}
                  class="opacity-70 hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title={`复制路径: ${nodePath}`}
                >
                  {#if copiedPath === nodePath}
                    <Check class="h-3 w-3 text-success" />
                  {:else}
                    <Copy class="h-3 w-3" />
                  {/if}
                </button>
              </div>
            {/if}
          {/each}
        </div>
        <span class="text-muted-foreground">&#125;</span>
      </div>
    {/if}
  </div>
</div>
