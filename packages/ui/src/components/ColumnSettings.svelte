<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import * as Popover from './ui/popover/index.js';
  import { SlidersHorizontal, RotateCcw, ArrowUp, ArrowDown, Search, Lock, Pin, PinOff } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface ColumnItem {
    key: string;
    label: string;
    visible: boolean;
    fixed?: 'left' | 'right';
    /** 业务必显列。隐藏、预设和已保存偏好都不能把它关掉。 */
    required?: boolean;
  }

  export interface ColumnPreset {
    id: string;
    label: string;
    visibleKeys: string[];
  }

  interface Props {
    columns: ColumnItem[];
    onchange?: (columns: ColumnItem[]) => void;
    onreset?: () => void;
    presets?: ColumnPreset[];
    storageKey?: string;
    title?: string;
    triggerVariant?: 'outline' | 'ghost' | 'secondary';
    triggerSize?: 'default' | 'sm' | 'icon' | 'icon-sm';
    class?: string;
  }

  let {
    columns = $bindable([]),
    onchange,
    onreset,
    presets = [],
    storageKey,
    title,
    triggerVariant = 'outline',
    triggerSize = 'sm',
    class: className = '',
  }: Props = $props();

  const i18n = useTranslation();
  let filterText = $state('');
  let open = $state(false);

  // Snapshot initial configuration for reset
  let initialSnapshot = $state<ColumnItem[]>(JSON.parse(JSON.stringify(columns)));
  let storageHydrated = false;

  // storageKey 之前只写不读；挂载后按 key 合并可见性、固定位和顺序，未知列仍按新定义保留。
  $effect(() => {
    if (storageHydrated || !storageKey || typeof window === 'undefined') return;
    storageHydrated = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const stored = new Map(parsed
        .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
        .filter((entry) => typeof entry['key'] === 'string')
        .map((entry) => [entry['key'] as string, entry]));
      const next = columns.map((column): ColumnItem => {
        const saved = stored.get(column.key);
        if (!saved) return column;
        const savedFixed = saved['fixed'];
        const fixed = savedFixed === 'left' ? 'left' : savedFixed === 'right' ? 'right' : undefined;
        const visible = column.required === true || saved['visible'] !== false;
        if (fixed === undefined) return { ...column, visible };
        return { ...column, visible, fixed };
      });
      const order = parsed
        .map((entry) => (entry && typeof entry === 'object' ? (entry as Record<string, unknown>)['key'] : undefined))
        .filter((key): key is string => typeof key === 'string');
      next.sort((left, right) => {
        const leftIndex = order.indexOf(left.key);
        const rightIndex = order.indexOf(right.key);
        return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex)
          - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
      });
      columns = next;
    } catch {
      // 存储损坏时保持调用方传入的资源默认列。
    }
  });

  const displayTitle = $derived(title ?? i18n.t('common.columnSettings', { defaultValue: 'Columns' }));
  const resetLabel = $derived(i18n.t('common.reset', { defaultValue: 'Reset' }));

  const filteredColumns = $derived(
    filterText.trim()
      ? columns.filter((c) => c.label.toLowerCase().includes(filterText.toLowerCase()) || c.key.toLowerCase().includes(filterText.toLowerCase()))
      : columns
  );

  const allVisible = $derived(columns.every((c) => c.visible));
  const someVisible = $derived(columns.some((c) => c.visible) && !allVisible);

  function savePreference(cols: ColumnItem[]) {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(cols));
      } catch {
        /* storage unavailable */
      }
    }
  }

  function toggleColumn(key: string) {
    const target = columns.find((column) => column.key === key);
    if (!target || target.required) return;
    if (target.visible && columns.filter((column) => column.visible).length <= 1) return;
    columns = columns.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c));
    savePreference(columns);
    onchange?.(columns);
  }

  function toggleAll(checked: boolean) {
    const hasRequired = columns.some((column) => column.required);
    if (!checked && !hasRequired) {
      // 至少保留一列，避免空表头无法自愈；保留第一列作为最小可见集。
      columns = columns.map((column, index) => ({ ...column, visible: index === 0 }));
    } else {
      columns = columns.map((c) => (c.required ? { ...c, visible: true } : { ...c, visible: checked }));
    }
    savePreference(columns);
    onchange?.(columns);
  }

  function toggleFixed(key: string) {
    columns = columns.map((column) => {
      if (column.key !== key) return column;
      if (column.fixed) {
        const { fixed: _fixed, ...rest } = column;
        return rest;
      }
      return { ...column, fixed: 'left' as const };
    });
    savePreference(columns);
    onchange?.(columns);
  }

  function applyPreset(preset: ColumnPreset) {
    const visibleKeys = new Set(preset.visibleKeys);
    columns = columns.map((column) => ({
      ...column,
      visible: column.required === true || visibleKeys.has(column.key),
    }));
    if (!columns.some((column) => column.visible) && columns[0]) {
      columns = columns.map((column, index) => ({ ...column, visible: index === 0 }));
    }
    savePreference(columns);
    onchange?.(columns);
  }

  function moveColumn(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const next = [...columns];
    const [moved] = next.splice(index, 1);
    if (moved === undefined) return;
    next.splice(targetIndex, 0, moved);

    columns = next;
    savePreference(columns);
    onchange?.(columns);
  }

  function handleReset() {
    columns = JSON.parse(JSON.stringify(initialSnapshot));
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* storage unavailable */
      }
    }
    onreset?.();
    onchange?.(columns);
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant={triggerVariant}
        size={triggerSize}
        class={cn('gap-1.5 text-xs font-normal', className)}
        aria-label={displayTitle}
      >
        <SlidersHorizontal class="h-3.5 w-3.5 text-muted-foreground" data-icon="inline-start" />
        <span>{displayTitle}</span>
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-72 p-3 text-xs" align="end">
    <!-- Header -->
    <div class="flex items-center justify-between pb-2 border-b border-border/60">
      <div class="flex items-center gap-2">
        <Checkbox
          checked={allVisible}
          indeterminate={someVisible}
          onCheckedChange={(checked) => toggleAll(checked === true)}
          aria-label={i18n.t('common.selectAll', { defaultValue: 'Select All' })}
        />
        <span class="font-medium text-foreground">{displayTitle}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1"
        onclick={handleReset}
      >
        <RotateCcw class="h-3 w-3" />
        {resetLabel}
      </Button>
    </div>

    <!-- Filter input if many columns -->
    {#if columns.length > 6}
      <div class="relative mt-2 mb-1">
        <Search class="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          bind:value={filterText}
          placeholder={i18n.t('common.search', { defaultValue: 'Search columns...' })}
          class="h-7.5 w-full rounded-md border border-input bg-muted/40 pl-7 pr-2 text-xs placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    {/if}

    {#if presets.length > 0}
      <div class="flex items-center gap-2 text-xs">
        {#each presets as preset (preset.id)}
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-column-preset={preset.id}
            onclick={() => applyPreset(preset)}
          >{preset.label}</Button>
        {/each}
      </div>
    {/if}

    <!-- Column list with ordering -->
    <div class="mt-2 max-h-60 overflow-y-auto space-y-1 pr-1">
      {#each filteredColumns as col (col.key)}
        {@const realIdx = columns.findIndex((c) => c.key === col.key)}
        <div class="flex items-center justify-between p-1 rounded-md hover:bg-muted/50 group transition-colors">
          <label class="flex items-center gap-2 cursor-pointer select-none truncate flex-1 pr-2">
            <Checkbox
              checked={col.visible}
              disabled={col.required}
              aria-disabled={col.required ? 'true' : undefined}
              data-column-required={col.required ? col.key : undefined}
              onCheckedChange={() => toggleColumn(col.key)}
            />
            <span class="truncate text-foreground {col.visible ? '' : 'text-muted-foreground line-through opacity-60'}">
              {col.label}
            </span>
            {#if col.required}
              <Lock class="h-3 w-3" aria-label="Required column" data-column-required={col.key} />
            {/if}
          </label>

          <div class="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              class="h-5 w-5 text-muted-foreground hover:text-foreground"
              aria-label={col.fixed ? 'Cancel fixed column' : 'Fix column left'}
              aria-pressed={Boolean(col.fixed)}
              data-column-fixed={col.fixed ?? 'none'}
              onclick={() => toggleFixed(col.key)}
            >
              {#if col.fixed}<PinOff class="h-3 w-3" />{:else}<Pin class="h-3 w-3" />{/if}
            </Button>
            <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              class="h-5 w-5 text-muted-foreground hover:text-foreground"
              disabled={realIdx === 0}
              onclick={() => moveColumn(realIdx, 'up')}
              aria-label="Move up"
            >
              <ArrowUp class="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-5 w-5 text-muted-foreground hover:text-foreground"
              disabled={realIdx === columns.length - 1}
              onclick={() => moveColumn(realIdx, 'down')}
              aria-label="Move down"
            >
              <ArrowDown class="h-3 w-3" />
            </Button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </Popover.Content>
</Popover.Root>
