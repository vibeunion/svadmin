<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export interface VirtualListProps<T = unknown> {
    items: T[];
    itemHeight?: number;
    height?: number | string;
    overscan?: number;
    endReachedThreshold?: number;
    class?: string;
    keyField?: string | keyof T | ((item: T, index: number) => string | number);
    onendreached?: () => void;
    children?: Snippet<[T, number]>;
    empty?: Snippet;
  }

  let {
    items = [],
    itemHeight = 48,
    height = 400,
    overscan = 5,
    endReachedThreshold = 50,
    class: className = '',
    keyField,
    onendreached,
    children,
    empty,
  }: VirtualListProps<T> = $props();

  let containerElement = $state<HTMLDivElement | null>(null);
  let scrollTop = $state(0);
  let measuredViewportHeight = $state<number | null>(null);

  const fallbackHeight = $derived(typeof height === 'number' ? height : 400);
  const viewportHeight = $derived(measuredViewportHeight ?? fallbackHeight);

  // 计算视口可见行范围
  const totalCount = $derived(items.length);
  const totalHeight = $derived(totalCount * itemHeight);

  const startIndex = $derived(
    Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  );

  const endIndex = $derived(
    Math.min(totalCount, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan)
  );

  const visibleItems = $derived.by(() => {
    const list: { item: T; index: number }[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      const currentItem = items[i];
      if (currentItem !== undefined) {
        list.push({ item: currentItem as T, index: i });
      }
    }
    return list;
  });

  const offsetY = $derived(startIndex * itemHeight);

  function getItemKey(item: T, index: number): string | number {
    if (typeof keyField === 'function') {
      return keyField(item, index);
    }
    if (typeof keyField === 'string' && item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      if (record[keyField] !== undefined) {
        return String(record[keyField]);
      }
    }
    return index;
  }

  function handleScroll(e: Event) {
    const target = e.currentTarget as HTMLDivElement;
    scrollTop = target.scrollTop;
    measuredViewportHeight = target.clientHeight;

    // 触底检测
    if (onendreached && totalCount > 0) {
      const distanceToBottom = target.scrollHeight - (target.scrollTop + target.clientHeight);
      if (distanceToBottom <= endReachedThreshold) {
        onendreached();
      }
    }
  }

  // 供外部调用的滚动方法
  export function scrollToIndex(index: number, behavior: 'auto' | 'smooth' = 'smooth') {
    if (!containerElement) return;
    const clampedIndex = Math.max(0, Math.min(index, totalCount - 1));
    containerElement.scrollTo({
      top: clampedIndex * itemHeight,
      behavior,
    });
  }

  export function scrollToTop(behavior: 'auto' | 'smooth' = 'smooth') {
    if (!containerElement) return;
    containerElement.scrollTo({ top: 0, behavior });
  }

  const containerHeightStyle = $derived(
    typeof height === 'number' ? `${height}px` : height
  );
</script>

<div
  bind:this={containerElement}
  data-svadmin-component="VirtualList"
  class={cn(
    'relative w-full overflow-y-auto rounded-lg border border-border bg-background shadow-xs',
    className
  )}
  style="height: {containerHeightStyle};"
  onscroll={handleScroll}
>
  {#if totalCount === 0}
    {#if empty}
      {@render empty()}
    {:else}
      <div class="flex h-full min-h-32 items-center justify-center p-6 text-sm text-muted-foreground">
        暂无数据
      </div>
    {/if}
  {:else}
    <!-- 撑高总虚拟高度容器 -->
    <div
      class="relative w-full"
      style="height: {totalHeight}px;"
    >
      <!-- 视口当前切片内容，使用 transform 移动到对应偏移 -->
      <div
        class="absolute left-0 top-0 w-full"
        style="transform: translateY({offsetY}px);"
      >
        {#each visibleItems as { item, index } (getItemKey(item, index))}
          <div
            class="flex items-center w-full"
            style="height: {itemHeight}px;"
            data-index={index}
          >
            {#if children}
              {@render children(item, index)}
            {:else}
              <div class="flex h-full w-full items-center border-b border-border/40 px-4 text-xs text-foreground">
                {#if typeof item === 'object' && item !== null && 'title' in item}
                  {(item as Record<string, unknown>)['title']}
                {:else if typeof item === 'object' && item !== null && 'name' in item}
                  {(item as Record<string, unknown>)['name']}
                {:else if typeof item === 'object' && item !== null && 'label' in item}
                  {(item as Record<string, unknown>)['label']}
                {:else}
                  Item {index + 1}: {String(item)}
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
