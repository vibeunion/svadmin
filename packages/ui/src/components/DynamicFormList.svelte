<script lang="ts" generics="T = Record<string, unknown>">
  import type { Snippet } from 'svelte';
  import { Plus, Trash2, ArrowUp, ArrowDown, Copy } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import TooltipButton from './TooltipButton.svelte';

  const i18n = useTranslation();

  interface Props {
    items?: T[];
    label?: string;
    description?: string;
    addButtonLabel?: string;
    minItems?: number;
    maxItems?: number;
    defaultItem?: T | (() => T);
    disabled?: boolean;
    emptyText?: string;
    onchange?: (items: T[]) => void;
    children?: Snippet<[{
      item: T;
      index: number;
      remove: () => void;
      moveUp: () => void;
      moveDown: () => void;
      duplicate: () => void;
      isFirst: boolean;
      isLast: boolean;
    }]>;
    headerExtra?: Snippet<[{ count: number; add: (item?: T) => void }]>;
  }

  let {
    items = $bindable([]),
    label,
    description,
    addButtonLabel,
    minItems = 0,
    maxItems = Infinity,
    defaultItem,
    disabled = false,
    emptyText,
    onchange,
    children,
    headerExtra,
  }: Props = $props();

  function createNewItem(): T {
    if (typeof defaultItem === 'function') {
      return (defaultItem as () => T)();
    }
    if (defaultItem !== undefined) {
      return structuredClone(defaultItem);
    }
    return {} as T;
  }

  export function add(customItem?: T): void {
    if (disabled || items.length >= maxItems) return;
    const itemToAdd = customItem !== undefined ? structuredClone(customItem) : createNewItem();
    items = [...items, itemToAdd];
    onchange?.(items);
  }

  export function remove(index: number): void {
    if (disabled || items.length <= minItems || index < 0 || index >= items.length) return;
    const next = [...items];
    next.splice(index, 1);
    items = next;
    onchange?.(items);
  }

  export function moveUp(index: number): void {
    if (disabled || index <= 0 || index >= items.length) return;
    const next = [...items];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    items = next;
    onchange?.(items);
  }

  export function moveDown(index: number): void {
    if (disabled || index < 0 || index >= items.length - 1) return;
    const next = [...items];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    items = next;
    onchange?.(items);
  }

  export function duplicate(index: number): void {
    if (disabled || items.length >= maxItems || index < 0 || index >= items.length) return;
    const next = [...items];
    const cloned = structuredClone(next[index]);
    next.splice(index + 1, 0, cloned);
    items = next;
    onchange?.(items);
  }
</script>

<div class="w-full space-y-3" data-testid="dynamic-form-list">
  {#if label || description || headerExtra}
    <div class="flex items-center justify-between gap-2">
      <div>
        {#if label}
          <div class="text-sm font-medium text-foreground">{label}</div>
        {/if}
        {#if description}
          <div class="text-xs text-muted-foreground">{description}</div>
        {/if}
      </div>
      {#if headerExtra}
        {@render headerExtra({ count: items.length, add })}
      {/if}
    </div>
  {/if}

  <div class="space-y-2">
    {#each items as item, index (index)}
      {@const isFirst = index === 0}
      {@const isLast = index === items.length - 1}
      <div class="group relative rounded-lg border border-border/70 bg-card p-3 shadow-xs transition-colors hover:border-border">
        <div class="flex items-start gap-3">
          <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
            {index + 1}
          </div>

          <div class="min-w-0 flex-1">
            {#if children}
              {@render children({
                item,
                index,
                remove: () => remove(index),
                moveUp: () => moveUp(index),
                moveDown: () => moveDown(index),
                duplicate: () => duplicate(index),
                isFirst,
                isLast,
              })}
            {:else}
              <div class="text-sm text-foreground/80">
                {JSON.stringify(item)}
              </div>
            {/if}
          </div>

          <div class="flex shrink-0 items-center gap-0.5 opacity-80 group-hover:opacity-100">
            <TooltipButton
              tooltip={i18n.t('common.moveUp', undefined) ?? '上移'}
              variant="ghost"
              size="icon-sm"
              disabled={disabled || isFirst}
              onclick={() => moveUp(index)}
            >
              <ArrowUp class="h-3.5 w-3.5" />
            </TooltipButton>

            <TooltipButton
              tooltip={i18n.t('common.moveDown', undefined) ?? '下移'}
              variant="ghost"
              size="icon-sm"
              disabled={disabled || isLast}
              onclick={() => moveDown(index)}
            >
              <ArrowDown class="h-3.5 w-3.5" />
            </TooltipButton>

            <TooltipButton
              tooltip={i18n.t('common.clone', undefined) ?? '复制'}
              variant="ghost"
              size="icon-sm"
              disabled={disabled || items.length >= maxItems}
              onclick={() => duplicate(index)}
            >
              <Copy class="h-3.5 w-3.5" />
            </TooltipButton>

            <TooltipButton
              tooltip={i18n.t('common.delete', undefined) ?? '删除'}
              variant="ghost"
              size="icon-sm"
              class="text-muted-foreground hover:text-destructive"
              disabled={disabled || items.length <= minItems}
              onclick={() => remove(index)}
            >
              <Trash2 class="h-3.5 w-3.5" />
            </TooltipButton>
          </div>
        </div>
      </div>
    {:else}
      <div class="rounded-lg border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
        {emptyText ?? (i18n.t('common.noData', undefined) ?? '暂无项目')}
      </div>
    {/each}
  </div>

  {#if items.length < maxItems}
    <Button
      type="button"
      variant="outline"
      size="sm"
      class="w-full gap-1.5 border-dashed"
      {disabled}
      onclick={() => add()}
    >
      <Plus class="h-4 w-4" />
      {addButtonLabel ?? (i18n.t('common.add', undefined) ?? '添加一项')}
    </Button>
  {/if}
</div>
