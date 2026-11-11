<script lang="ts">
  import { untrack } from 'svelte';
  import {
    ArrowDown,
    ArrowUp,
    Bookmark,
    GripVertical,
    Lock,
    Pin,
    PinOff,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import * as Sheet from './ui/sheet/index.js';
  import type { ColumnItem, ColumnPreset } from './ColumnSettings.svelte';

  export interface ColumnVisibilityDrawerProps {
    open?: boolean | undefined;
    columns: ColumnItem[];
    presets?: ColumnPreset[] | undefined;
    storageKey?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    allowCustomPresets?: boolean | undefined;
    class?: string | undefined;
    onchange?: ((columns: ColumnItem[]) => void) | undefined;
    onreset?: (() => void) | undefined;
  }

  let {
    open = $bindable(false),
    columns = $bindable([]),
    presets = [],
    storageKey,
    title,
    description,
    allowCustomPresets = true,
    class: className = '',
    onchange,
    onreset,
  }: ColumnVisibilityDrawerProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let filterQuery = $state('');
  let initialColumnsSnapshot = $state<ColumnItem[]>([]);
  let customPresets = $state<ColumnPreset[]>([]);
  let newPresetName = $state('');
  let showSavePresetInput = $state(false);

  let draggedIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);

  let storageHydrated = false;

  $effect(() => {
    if (initialColumnsSnapshot.length === 0 && columns.length > 0) {
      initialColumnsSnapshot = JSON.parse(JSON.stringify(columns));
    }
  });

  $effect(() => {
    if (storageHydrated || !storageKey || typeof window === 'undefined') return;
    storageHydrated = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;

      const record = parsed as Record<string, unknown>;
      const storedCols = record['columns'];
      const storedPresets = record['customPresets'];

      if (Array.isArray(storedPresets)) {
        customPresets = storedPresets as ColumnPreset[];
      }

      if (Array.isArray(storedCols)) {
        const storedMap = new Map(
          storedCols
            .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
            .filter((c) => typeof c['key'] === 'string')
            .map((c) => [c['key'] as string, c]),
        );

        const merged = untrack(() => columns).map((column): ColumnItem => {
          const saved = storedMap.get(column.key);
          if (!saved) return column;
          const fixed =
            saved['fixed'] === 'left' ? 'left' : saved['fixed'] === 'right' ? 'right' : undefined;
          const visible = column.required === true || saved['visible'] !== false;
          if (fixed === undefined) return { ...column, visible };
          return { ...column, visible, fixed };
        });

        const order = storedCols
          .map((c) => (c && typeof c === 'object' ? (c as Record<string, unknown>)['key'] : undefined))
          .filter((k): k is string => typeof k === 'string');

        merged.sort((a, b) => {
          const idxA = order.indexOf(a.key);
          const idxB = order.indexOf(b.key);
          return (idxA < 0 ? 9999 : idxA) - (idxB < 0 ? 9999 : idxB);
        });

        columns = merged;
      }
    } catch {
      // Fallback
    }
  });

  function savePreference(cols: ColumnItem[], userPresets = customPresets) {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          columns: cols,
          customPresets: userPresets,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Ignore
    }
  }

  const filteredColumns = $derived(
    filterQuery.trim()
      ? columns.filter(
          (c) =>
            c.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
            c.key.toLowerCase().includes(filterQuery.toLowerCase()),
        )
      : columns,
  );

  const visibleCount = $derived(columns.filter((c) => c.visible).length);
  const allVisible = $derived(columns.length > 0 && columns.every((c) => c.visible));
  const someVisible = $derived(visibleCount > 0 && !allVisible);

  function toggleColumn(key: string) {
    const target = columns.find((c) => c.key === key);
    if (!target || target.required) return;
    if (target.visible && visibleCount <= 1) return;
    columns = columns.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c));
    savePreference(columns);
    onchange?.(columns);
  }

  function toggleAll(checked: boolean) {
    const hasRequired = columns.some((c) => c.required);
    if (!checked && !hasRequired) {
      columns = columns.map((c, idx) => ({ ...c, visible: idx === 0 }));
    } else {
      columns = columns.map((c) => (c.required ? { ...c, visible: true } : { ...c, visible: checked }));
    }
    savePreference(columns);
    onchange?.(columns);
  }

  function toggleFixed(key: string, side: 'left' | 'right') {
    columns = columns.map((c) => {
      if (c.key !== key) return c;
      if (c.fixed === side) {
        const { fixed: _fixed, ...rest } = c;
        return rest;
      }
      return { ...c, fixed: side };
    });
    savePreference(columns);
    onchange?.(columns);
  }

  function moveColumn(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= columns.length || fromIndex === toIndex) return;
    const next = [...columns];
    const [moved] = next.splice(fromIndex, 1);
    if (moved === undefined) return;
    next.splice(toIndex, 0, moved);
    columns = next;
    savePreference(columns);
    onchange?.(columns);
  }

  function handleDragStart(event: DragEvent, index: number) {
    draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    dragOverIndex = index;
  }

  function handleDragLeave(index: number) {
    if (dragOverIndex === index) {
      dragOverIndex = null;
    }
  }

  function handleDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveColumn(draggedIndex, targetIndex);
    }
    draggedIndex = null;
    dragOverIndex = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
  }

  function applyPreset(preset: ColumnPreset) {
    const visibleKeys = new Set(preset.visibleKeys);
    columns = columns.map((c) => ({
      ...c,
      visible: c.required === true || visibleKeys.has(c.key),
    }));
    if (!columns.some((c) => c.visible) && columns[0]) {
      columns = columns.map((c, idx) => ({ ...c, visible: idx === 0 }));
    }
    savePreference(columns);
    onchange?.(columns);
  }

  function saveCurrentAsPreset() {
    const name = newPresetName.trim();
    if (!name) return;
    const newPreset: ColumnPreset = {
      id: `custom-preset-${Date.now()}`,
      label: name,
      visibleKeys: columns.filter((c) => c.visible).map((c) => c.key),
    };
    customPresets = [...customPresets, newPreset];
    newPresetName = '';
    showSavePresetInput = false;
    savePreference(columns, customPresets);
  }

  function removeCustomPreset(id: string) {
    customPresets = customPresets.filter((p) => p.id !== id);
    savePreference(columns, customPresets);
  }

  function handleReset() {
    if (initialColumnsSnapshot.length > 0) {
      columns = JSON.parse(JSON.stringify(initialColumnsSnapshot));
    }
    if (storageKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Ignore
      }
    }
    customPresets = [];
    onreset?.();
    onchange?.(columns);
  }

  const allPresets = $derived([...presets, ...customPresets]);
  const resolvedTitle = $derived(
    title ?? (chinese ? '高级列管理器与多维视图' : 'Column Visibility & View Manager'),
  );
  const resolvedDesc = $derived(
    description ??
      (chinese
        ? '自定义宽表列显隐、左右侧锁列固定与拖拽排序，支持多视图预设与本地持久化'
        : 'Manage column visibility, left/right pinning, and drag-and-drop reordering with view presets'),
  );
</script>

<Sheet.Root bind:open side="right">
  <Sheet.Content class={cn('w-full sm:max-w-md p-0 flex flex-col', className)}>
    <div class="px-6 py-5 border-b border-border/70 bg-card">
      <div class="flex items-center gap-2.5 text-primary">
        <SlidersHorizontal class="h-5 w-5" />
        <Sheet.Title class="text-base font-semibold text-foreground">
          {resolvedTitle}
        </Sheet.Title>
      </div>
      <Sheet.Description class="text-xs text-muted-foreground mt-1 leading-relaxed">
        {resolvedDesc}
      </Sheet.Description>

      <div class="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs">
        <div class="flex items-center gap-2">
          <Checkbox
            checked={allVisible}
            indeterminate={someVisible}
            onCheckedChange={(checked) => toggleAll(checked === true)}
            aria-label="Select all columns"
          />
          <span class="font-medium text-foreground">
            {chinese
              ? `已显示 ${visibleCount} / ${columns.length} 列`
              : `Showing ${visibleCount} of ${columns.length} columns`}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
          onclick={handleReset}
        >
          <RotateCcw class="h-3 w-3" />
          {chinese ? '恢复默认' : 'Reset'}
        </Button>
      </div>
    </div>

    {#if allPresets.length > 0 || allowCustomPresets}
      <div class="px-6 py-3 border-b border-border/60 bg-muted/20 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Bookmark class="h-3 w-3" />
            {chinese ? '快速视图预设' : 'View Presets'}
          </span>
          {#if allowCustomPresets && !showSavePresetInput}
            <button
              type="button"
              onclick={() => (showSavePresetInput = true)}
              class="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <Plus class="h-3 w-3" />
              {chinese ? '存为新视图' : 'Save as Preset'}
            </button>
          {/if}
        </div>

        {#if showSavePresetInput}
          <div class="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              bind:value={newPresetName}
              placeholder={chinese ? '输入视图名称 (如: 财务视图)...' : 'Preset name...'}
              class="h-7 flex-1 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button size="sm" class="h-7 px-2.5 text-xs" onclick={saveCurrentAsPreset}>
              {chinese ? '保存' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-7 px-2 text-xs"
              onclick={() => {
                showSavePresetInput = false;
                newPresetName = '';
              }}
            >
              <X class="h-3.5 w-3.5" />
            </Button>
          </div>
        {/if}

        <div class="flex flex-wrap gap-1.5 pt-0.5">
          {#each allPresets as preset (preset.id)}
            {@const isCustom = customPresets.some((p) => p.id === preset.id)}
            <div class="inline-flex items-center rounded-md border border-border bg-background shadow-2xs overflow-hidden">
              <button
                type="button"
                onclick={() => applyPreset(preset)}
                class="px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                {preset.label}
              </button>
              {#if isCustom}
                <button
                  type="button"
                  onclick={() => removeCustomPreset(preset.id)}
                  class="px-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label={`Remove preset ${preset.label}`}
                >
                  <Trash2 class="h-3 w-3" />
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="px-6 py-2.5 border-b border-border/50 bg-background">
      <div class="relative flex items-center">
        <Search class="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          bind:value={filterQuery}
          placeholder={chinese ? '快速检索列名或字段 Key...' : 'Search column name or key...'}
          class="h-8 w-full rounded-md border border-input bg-muted/30 pl-8 pr-2.5 text-xs placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {#if filterQuery}
          <button
            type="button"
            onclick={() => (filterQuery = '')}
            class="absolute right-2 text-muted-foreground hover:text-foreground"
            aria-label="Clear filter"
          >
            <X class="h-3 w-3" />
          </button>
        {/if}
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-3 space-y-1.5" role="list">
      {#each filteredColumns as col (col.key)}
        {@const realIdx = columns.findIndex((c) => c.key === col.key)}
        {@const isDragging = draggedIndex === realIdx}
        {@const isOver = dragOverIndex === realIdx}
        <div
          role="listitem"
          draggable={!col.required}
          ondragstart={(e) => handleDragStart(e, realIdx)}
          ondragover={(e) => handleDragOver(e, realIdx)}
          ondragleave={() => handleDragLeave(realIdx)}
          ondrop={(e) => handleDrop(e, realIdx)}
          ondragend={handleDragEnd}
          class={cn(
            'group flex items-center justify-between rounded-lg border p-2 text-xs transition-all bg-card',
            isDragging && 'opacity-40 border-dashed border-primary',
            isOver && !isDragging && 'border-primary ring-1 ring-primary/30 bg-primary/5',
            !isDragging && !isOver && 'border-border/70 hover:border-border hover:bg-muted/30',
          )}
          data-column-key={col.key}
          data-column-visible={col.visible ? 'true' : 'false'}
          data-column-fixed={col.fixed ?? 'none'}
        >
          <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
            <span
              class={cn(
                'text-muted-foreground/50 transition-colors',
                col.required ? 'opacity-20 cursor-not-allowed' : 'cursor-grab group-hover:text-foreground',
              )}
              title={chinese ? '拖拽调整顺序' : 'Drag to reorder'}
            >
              <GripVertical class="h-3.5 w-3.5" />
            </span>

            <Checkbox
              checked={col.visible}
              disabled={col.required}
              onCheckedChange={() => toggleColumn(col.key)}
              aria-label={`Toggle ${col.label}`}
            />

            <span
              class={cn(
                'truncate font-medium',
                col.visible ? 'text-foreground' : 'text-muted-foreground line-through opacity-60',
              )}
            >
              {col.label}
            </span>

            {#if col.required}
              <Lock class="h-3 w-3 text-muted-foreground shrink-0" title={chinese ? '业务必显列' : 'Required column'} />
            {/if}

            {#if col.fixed}
              <span class="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-medium text-primary shrink-0">
                {col.fixed === 'left' ? (chinese ? '左固定' : 'Pin Left') : (chinese ? '右固定' : 'Pin Right')}
              </span>
            {/if}
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onclick={() => toggleFixed(col.key, 'left')}
              class={cn(
                'rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                col.fixed === 'left' && 'text-primary bg-primary/10',
              )}
              title={col.fixed === 'left' ? (chinese ? '取消左侧固定' : 'Unpin') : (chinese ? '固定在左侧' : 'Pin Left')}
              aria-label={`Pin ${col.label} left`}
            >
              {#if col.fixed === 'left'}<PinOff class="h-3.5 w-3.5" />{:else}<Pin class="h-3.5 w-3.5" />{/if}
            </button>

            <button
              type="button"
              disabled={realIdx === 0}
              onclick={() => moveColumn(realIdx, realIdx - 1)}
              class="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              title={chinese ? '上移' : 'Move up'}
              aria-label={`Move ${col.label} up`}
            >
              <ArrowUp class="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={realIdx === columns.length - 1}
              onclick={() => moveColumn(realIdx, realIdx + 1)}
              class="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              title={chinese ? '下移' : 'Move down'}
              aria-label={`Move ${col.label} down`}
            >
              <ArrowDown class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      {/each}

      {#if filteredColumns.length === 0}
        <div class="py-12 text-center text-xs text-muted-foreground">
          {chinese ? '没有找到匹配的列' : 'No matching columns found'}
        </div>
      {/if}
    </div>

    <div class="px-6 py-4 border-t border-border/70 bg-card flex items-center justify-between">
      <span class="text-[11px] text-muted-foreground">
        {chinese ? '支持拖拽手柄平滑排序与双侧固定' : 'Drag handle to reorder, pin to lock sides'}
      </span>
      <Button size="sm" onclick={() => (open = false)} class="min-w-20">
        {chinese ? '完成' : 'Done'}
      </Button>
    </div>
  </Sheet.Content>
</Sheet.Root>
