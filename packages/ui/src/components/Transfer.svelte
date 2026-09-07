<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import type { Snippet } from 'svelte';
  import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Search } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { useTranslation } from '@svadmin/core/i18n';

  export interface TransferItem {
    key: string | number;
    title: string;
    description?: string;
    disabled?: boolean;
  }

  const i18n = useTranslation();

  interface Props {
    dataSource?: TransferItem[];
    targetKeys?: (string | number)[];
    titles?: [string, string];
    searchable?: boolean;
    disabled?: boolean;
    class?: string;
    onchange?: (
      nextTargetKeys: (string | number)[],
      direction: 'left' | 'right',
      moveKeys: (string | number)[]
    ) => void;
    renderItem?: Snippet<[{ item: TransferItem; direction: 'left' | 'right' }]>;
  }

  let {
    dataSource = [],
    targetKeys = $bindable([]),
    titles = ['源列表', '目标列表'],
    searchable = true,
    disabled = false,
    class: className,
    onchange,
    renderItem,
  }: Props = $props();

  let leftSearch = $state('');
  let rightSearch = $state('');

  const leftSelected = new SvelteSet<string | number>();
  const rightSelected = new SvelteSet<string | number>();

  const targetKeySet = $derived(new Set(targetKeys));

  const leftDataSource = $derived(
    dataSource.filter((item) => !targetKeySet.has(item.key))
  );

  const rightDataSource = $derived(
    dataSource.filter((item) => targetKeySet.has(item.key))
  );

  const filteredLeft = $derived(
    leftDataSource.filter((item) => {
      if (!leftSearch.trim()) return true;
      const q = leftSearch.toLowerCase();
      return item.title.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
    })
  );

  const filteredRight = $derived(
    rightDataSource.filter((item) => {
      if (!rightSearch.trim()) return true;
      const q = rightSearch.toLowerCase();
      return item.title.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
    })
  );

  function toggleLeftSelect(key: string | number) {
    if (leftSelected.has(key)) leftSelected.delete(key);
    else leftSelected.add(key);
  }

  function toggleRightSelect(key: string | number) {
    if (rightSelected.has(key)) rightSelected.delete(key);
    else rightSelected.add(key);
  }

  function toggleAllLeft() {
    const selectable = filteredLeft.filter((i) => !i.disabled);
    const allSelected = selectable.length > 0 && selectable.every((i) => leftSelected.has(i.key));
    if (allSelected) {
      for (const item of selectable) leftSelected.delete(item.key);
    } else {
      for (const item of selectable) leftSelected.add(item.key);
    }
  }

  function toggleAllRight() {
    const selectable = filteredRight.filter((i) => !i.disabled);
    const allSelected = selectable.length > 0 && selectable.every((i) => rightSelected.has(i.key));
    if (allSelected) {
      for (const item of selectable) rightSelected.delete(item.key);
    } else {
      for (const item of selectable) rightSelected.add(item.key);
    }
  }

  export function moveToRight() {
    if (disabled) return;
    const moveKeys = Array.from(leftSelected).filter((key) =>
      leftDataSource.some((item) => item.key === key && !item.disabled)
    );
    if (moveKeys.length === 0) return;

    const next = [...targetKeys, ...moveKeys];
    targetKeys = next;
    leftSelected.clear();
    onchange?.(next, 'right', moveKeys);
  }

  export function moveToLeft() {
    if (disabled) return;
    const moveKeys = Array.from(rightSelected).filter((key) =>
      rightDataSource.some((item) => item.key === key && !item.disabled)
    );
    if (moveKeys.length === 0) return;

    const moveKeySet = new Set(moveKeys);
    const next = targetKeys.filter((k) => !moveKeySet.has(k));
    targetKeys = next;
    rightSelected.clear();
    onchange?.(next, 'left', moveKeys);
  }

  export function moveAllToRight() {
    if (disabled) return;
    const moveKeys = leftDataSource.filter((i) => !i.disabled).map((i) => i.key);
    if (moveKeys.length === 0) return;
    const next = [...targetKeys, ...moveKeys];
    targetKeys = next;
    leftSelected.clear();
    onchange?.(next, 'right', moveKeys);
  }

  export function moveAllToLeft() {
    if (disabled) return;
    const moveKeys = rightDataSource.filter((i) => !i.disabled).map((i) => i.key);
    if (moveKeys.length === 0) return;
    const moveKeySet = new Set(moveKeys);
    const next = targetKeys.filter((k) => !moveKeySet.has(k));
    targetKeys = next;
    rightSelected.clear();
    onchange?.(next, 'left', moveKeys);
  }
</script>

<div class={cn('svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-020ba687fa12 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-6da6a3c3f741', className)} data-testid="transfer">
  <!-- Left Panel -->
  <div class="svadmin-u-36e579c0b41c svadmin-u-6da6a3c3f741 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-ff4a6777f1bc">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-65fdbade2025 svadmin-u-c9ed8c5f79ae svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-2859c861d7de">
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        <Checkbox
          checked={filteredLeft.length > 0 && filteredLeft.filter((i) => !i.disabled).every((i) => leftSelected.has(i.key))}
          disabled={disabled || filteredLeft.filter((i) => !i.disabled).length === 0}
          onCheckedChange={toggleAllLeft}
        />
        <span class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{titles[0]}</span>
      </div>
      <span class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-3032cae0badb">
        {leftSelected.size} / {leftDataSource.length}
      </span>
    </div>

    {#if searchable}
      <div class="svadmin-u-7660b450905a svadmin-u-65fdbade2025 svadmin-u-6ee2d41e2d2d">
        <div class="svadmin-u-d89972fe17d6">
          <Search class="svadmin-u-da4dbfbc4fdc svadmin-u-ecfeb742a3f3 svadmin-u-7a470f4c9b28 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-bfa603190748" />
          <Input
            type="text"
            bind:value={leftSearch}
            placeholder={i18n.t('common.search', undefined) ?? '搜索...'}
            class="svadmin-u-ed8a5df7b2fb svadmin-u-e4af885410fe svadmin-u-aa2c13a5e1b4 svadmin-u-359090c2d529"
            {disabled}
          />
        </div>
      </div>
    {/if}

    <div class="svadmin-u-36e579c0b41c svadmin-u-92bf82f493b1 svadmin-u-eb6a3cef9686 svadmin-u-e2eedc5718f0">
      {#each filteredLeft as item (item.key)}
        {@const selected = leftSelected.has(item.key)}
        <div
          role="button"
          tabindex="0"
          class={cn(
            'svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-421ac2be5045 svadmin-u-0b91436debbd svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-7f6912283f11',
            selected ? 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069' : 'svadmin-u-39f703dbe296 svadmin-u-d4108abe6359',
            item.disabled && 'svadmin-u-0b8c506a0596 svadmin-u-29b733e4c162 svadmin-u-a4326536b8f5'
          )}
          onclick={() => toggleLeftSelect(item.key)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleLeftSelect(item.key);
            }
          }}
        >
          <Checkbox
            checked={selected}
            disabled={disabled || item.disabled}
            onCheckedChange={() => toggleLeftSelect(item.key)}
          />
          <div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c">
            {#if renderItem}
              {@render renderItem({ item, direction: 'left' })}
            {:else}
              <div class="svadmin-u-f283ea9bea0e">{item.title}</div>
              {#if item.description}
                <div class="svadmin-u-f283ea9bea0e svadmin-u-1dc571a3609f svadmin-u-bfa603190748">{item.description}</div>
              {/if}
            {/if}
          </div>
        </div>
      {:else}
        <div class="svadmin-u-1100bef66e60 svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
          {i18n.t('common.noData', undefined) ?? '无项目'}
        </div>
      {/each}
    </div>
  </div>

  <!-- Middle Action Buttons -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-9c4dae6452a4 svadmin-u-58284b4ea568 svadmin-u-012fbd121f37 svadmin-u-86843cf1e227">
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      disabled={disabled || leftSelected.size === 0}
      onclick={moveToRight}
      title="转移所选项"
    >
      <ChevronRight class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
    </Button>

    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      disabled={disabled || rightSelected.size === 0}
      onclick={moveToLeft}
      title="移除所选项"
    >
      <ChevronLeft class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
    </Button>

    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled || leftDataSource.length === 0}
      onclick={moveAllToRight}
      title="全部转移"
    >
      <ChevronsRight class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
    </Button>

    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled || rightDataSource.length === 0}
      onclick={moveAllToLeft}
      title="全部移除"
    >
      <ChevronsLeft class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
    </Button>
  </div>

  <!-- Right Panel -->
  <div class="svadmin-u-36e579c0b41c svadmin-u-6da6a3c3f741 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-ff4a6777f1bc">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-65fdbade2025 svadmin-u-c9ed8c5f79ae svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-2859c861d7de">
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        <Checkbox
          checked={filteredRight.length > 0 && filteredRight.filter((i) => !i.disabled).every((i) => rightSelected.has(i.key))}
          disabled={disabled || filteredRight.filter((i) => !i.disabled).length === 0}
          onCheckedChange={toggleAllRight}
        />
        <span class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{titles[1]}</span>
      </div>
      <span class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-3032cae0badb">
        {rightSelected.size} / {rightDataSource.length}
      </span>
    </div>

    {#if searchable}
      <div class="svadmin-u-7660b450905a svadmin-u-65fdbade2025 svadmin-u-6ee2d41e2d2d">
        <div class="svadmin-u-d89972fe17d6">
          <Search class="svadmin-u-da4dbfbc4fdc svadmin-u-ecfeb742a3f3 svadmin-u-7a470f4c9b28 svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-bfa603190748" />
          <Input
            type="text"
            bind:value={rightSearch}
            placeholder={i18n.t('common.search', undefined) ?? '搜索...'}
            class="svadmin-u-ed8a5df7b2fb svadmin-u-e4af885410fe svadmin-u-aa2c13a5e1b4 svadmin-u-359090c2d529"
            {disabled}
          />
        </div>
      </div>
    {/if}

    <div class="svadmin-u-36e579c0b41c svadmin-u-92bf82f493b1 svadmin-u-eb6a3cef9686 svadmin-u-e2eedc5718f0">
      {#each filteredRight as item (item.key)}
        {@const selected = rightSelected.has(item.key)}
        <div
          role="button"
          tabindex="0"
          class={cn(
            'svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-421ac2be5045 svadmin-u-0b91436debbd svadmin-u-ec0091ee009b svadmin-u-359090c2d529 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-7f6912283f11',
            selected ? 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069' : 'svadmin-u-39f703dbe296 svadmin-u-d4108abe6359',
            item.disabled && 'svadmin-u-0b8c506a0596 svadmin-u-29b733e4c162 svadmin-u-a4326536b8f5'
          )}
          onclick={() => toggleRightSelect(item.key)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleRightSelect(item.key);
            }
          }}
        >
          <Checkbox
            checked={selected}
            disabled={disabled || item.disabled}
            onCheckedChange={() => toggleRightSelect(item.key)}
          />
          <div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c">
            {#if renderItem}
              {@render renderItem({ item, direction: 'right' })}
            {:else}
              <div class="svadmin-u-f283ea9bea0e">{item.title}</div>
              {#if item.description}
                <div class="svadmin-u-f283ea9bea0e svadmin-u-1dc571a3609f svadmin-u-bfa603190748">{item.description}</div>
              {/if}
            {/if}
          </div>
        </div>
      {:else}
        <div class="svadmin-u-1100bef66e60 svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748">
          {i18n.t('common.noData', undefined) ?? '无项目'}
        </div>
      {/each}
    </div>
  </div>
</div>
