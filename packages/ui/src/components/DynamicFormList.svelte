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

<div class="svadmin-u-6da6a3c3f741 svadmin-u-6ed543e2fbbb" data-testid="dynamic-form-list">
  {#if label || description || headerExtra}
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4">
      <div>
        {#if label}
          <div class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{label}</div>
        {/if}
        {#if description}
          <div class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{description}</div>
        {/if}
      </div>
      {#if headerExtra}
        {@render headerExtra({ count: items.length, add })}
      {/if}
    </div>
  {/if}

  <div class="svadmin-u-6f7e013d6499">
    {#each items as item, index (index)}
      {@const isFirst = index === 0}
      {@const isLast = index === items.length - 1}
      <div class="group svadmin-u-d89972fe17d6 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-22bb278694b4 svadmin-u-cd0ad9a56558 svadmin-u-eb6e8b881acd svadmin-u-cef5b893cf23 svadmin-u-ceb69a6b0e5f svadmin-u-512e82e6a68f">
        <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-1004c0c3954c">
          <div class="svadmin-u-60fbb7713999 svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219 svadmin-u-d058ca6de60f svadmin-u-2689f3958069 svadmin-u-bfa603190748">
            {index + 1}
          </div>

          <div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c">
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
              <div class="svadmin-u-fc7473ca09eb svadmin-u-f93148569c39">
                {JSON.stringify(item)}
              </div>
            {/if}
          </div>

          <div class="svadmin-u-60fbb7713999 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-a3899220f90e svadmin-u-714816efc69c svadmin-u-181f3d6c9821">
            <TooltipButton
              tooltip={i18n.t('common.moveUp', undefined) ?? '上移'}
              variant="ghost"
              size="icon-sm"
              disabled={disabled || isFirst}
              onclick={() => moveUp(index)}
            >
              <ArrowUp class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            </TooltipButton>

            <TooltipButton
              tooltip={i18n.t('common.moveDown', undefined) ?? '下移'}
              variant="ghost"
              size="icon-sm"
              disabled={disabled || isLast}
              onclick={() => moveDown(index)}
            >
              <ArrowDown class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            </TooltipButton>

            <TooltipButton
              tooltip={i18n.t('common.clone', undefined) ?? '复制'}
              variant="ghost"
              size="icon-sm"
              disabled={disabled || items.length >= maxItems}
              onclick={() => duplicate(index)}
            >
              <Copy class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            </TooltipButton>

            <TooltipButton
              tooltip={i18n.t('common.delete', undefined) ?? '删除'}
              variant="ghost"
              size="icon-sm"
              class="svadmin-u-bfa603190748 svadmin-u-51e95020d6f2"
              disabled={disabled || items.length <= minItems}
              onclick={() => remove(index)}
            >
              <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            </TooltipButton>
          </div>
        </div>
      </div>
    {:else}
      <div class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-a29b7a649c77 svadmin-u-c9ed8c5f79ae svadmin-u-0478c89a150f svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
        {emptyText ?? (i18n.t('common.noData', undefined) ?? '暂无项目')}
      </div>
    {/each}
  </div>

  {#if items.length < maxItems}
    <Button
      type="button"
      variant="outline"
      size="sm"
      class="svadmin-u-6da6a3c3f741 svadmin-u-58284b4ea568 svadmin-u-a29b7a649c77"
      {disabled}
      onclick={() => add()}
    >
      <Plus class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
      {addButtonLabel ?? (i18n.t('common.add', undefined) ?? '添加一项')}
    </Button>
  {/if}
</div>
