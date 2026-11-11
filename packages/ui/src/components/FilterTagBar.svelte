<script lang="ts">
  import { onMount } from 'svelte';
  import { Bookmark, BookmarkPlus, X, Trash2, Check, Filter } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface FilterTagItem {
    id: string;
    field: string;
    label: string;
    operatorLabel?: string | undefined;
    valueLabel: string;
  }

  export interface SavedPresetView {
    id: string;
    name: string;
    filters: FilterTagItem[];
  }

  export interface FilterTagBarProps {
    filters: FilterTagItem[];
    storageKey?: string | undefined;
    onremove?: ((filterId: string) => void) | undefined;
    onclear?: (() => void) | undefined;
    onapplypreset?: ((preset: SavedPresetView) => void) | undefined;
    class?: string | undefined;
  }

  let {
    filters = [],
    storageKey = 'svadmin_saved_filter_views',
    onremove,
    onclear,
    onapplypreset,
    class: className = '',
  }: FilterTagBarProps = $props();

  let isSavingView = $state(false);
  let newViewName = $state('');
  let savedPresets = $state<SavedPresetView[]>([]);
  let activePresetId = $state<string | null>(null);

  function loadPresets() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        savedPresets = JSON.parse(raw) as SavedPresetView[];
      }
    } catch {
      // Ignore
    }
  }

  function persistPresets(list: SavedPresetView[]) {
    savedPresets = list;
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(list));
    } catch {
      // Ignore
    }
  }

  function saveCurrentView() {
    const name = newViewName.trim();
    if (!name || filters.length === 0) return;
    const newPreset: SavedPresetView = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      filters: $state.snapshot(filters),
    };
    persistPresets([...savedPresets, newPreset]);
    activePresetId = newPreset.id;
    newViewName = '';
    isSavingView = false;
  }

  function deletePreset(id: string) {
    persistPresets(savedPresets.filter((p) => p.id !== id));
    if (activePresetId === id) activePresetId = null;
  }

  function applyPreset(preset: SavedPresetView) {
    activePresetId = preset.id;
    onapplypreset?.(preset);
  }

  onMount(() => {
    loadPresets();
  });
</script>

<div
  class={cn('flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border bg-card p-2.5 text-xs text-card-foreground shadow-2xs', className)}
  data-svadmin-component="FilterTagBar"
>
  <!-- Left: Filter Icon & Tags List -->
  <div class="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
    <div class="flex items-center gap-1 text-muted-foreground mr-1 shrink-0 font-medium select-none">
      <Filter class="h-3.5 w-3.5 text-primary" />
      <span>已生效筛选 ({filters.length})</span>
    </div>

    {#if filters.length === 0}
      <span class="text-muted-foreground italic select-none">当前无筛选条件，展示全部数据</span>
    {:else}
      {#each filters as item (item.id)}
        <span
          class="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-foreground font-medium select-none"
          data-filter-tag={item.id}
        >
          <span class="text-muted-foreground">{item.label}</span>
          {#if item.operatorLabel}
            <span class="font-mono text-[10px] text-primary">{item.operatorLabel}</span>
          {/if}
          <span class="font-semibold">{item.valueLabel}</span>
          <button
            type="button"
            class="rounded-full p-0.5 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
            onclick={() => onremove?.(item.id)}
            aria-label="Remove filter"
          >
            <X class="h-3 w-3" />
          </button>
        </span>
      {/each}

      <button
        type="button"
        class="text-muted-foreground hover:text-destructive underline transition-colors cursor-pointer ml-1 font-medium select-none"
        onclick={onclear}
      >
        清空全部
      </button>
    {/if}
  </div>

  <!-- Right: Preset Views & Save Action -->
  <div class="flex items-center gap-2 shrink-0 select-none">
    {#if savedPresets.length > 0}
      <div class="flex items-center gap-1">
        <Bookmark class="h-3.5 w-3.5 text-muted-foreground" />
        <select
          class="rounded border border-input bg-background px-2 py-0.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
          value={activePresetId ?? ''}
          onchange={(e) => {
            const target = e.currentTarget as HTMLSelectElement;
            const preset = savedPresets.find((p) => p.id === target.value);
            if (preset) applyPreset(preset);
          }}
        >
          <option value="">常用视图预设...</option>
          {#each savedPresets as p (p.id)}
            <option value={p.id}>{p.name} ({p.filters.length} 项)</option>
          {/each}
        </select>
        {#if activePresetId}
          <button
            type="button"
            class="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            onclick={() => activePresetId && deletePreset(activePresetId)}
            title="删除此预设"
            aria-label="Delete active preset"
          >
            <Trash2 class="h-3 w-3" />
          </button>
        {/if}
      </div>
    {/if}

    {#if isSavingView}
      <div class="flex items-center gap-1 rounded border border-border bg-background p-0.5">
        <input
          type="text"
          class="bg-transparent px-2 py-0.5 text-xs text-foreground outline-none w-28"
          bind:value={newViewName}
          placeholder="预设视图名称"
          onkeydown={(e) => e.key === 'Enter' && saveCurrentView()}
        />
        <button
          type="button"
          class="rounded p-1 text-success hover:bg-success/10 transition-colors cursor-pointer"
          onclick={saveCurrentView}
          disabled={!newViewName.trim()}
          title="确认保存"
        >
          <Check class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          onclick={() => (isSavingView = false)}
          title="取消"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    {:else if filters.length > 0}
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium"
        onclick={() => (isSavingView = true)}
      >
        <BookmarkPlus class="h-3.5 w-3.5 text-primary" />
        <span>存为常用视图</span>
      </button>
    {/if}
  </div>
</div>
