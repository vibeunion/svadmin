<script lang="ts">
  import { onMount } from 'svelte';

  export interface HotkeyItem {
    id: string;
    name: string;
    keys: string[];
    description?: string;
    category?: string;
    scope?: string;
  }

  export interface HotkeysHelpModalProps {
    open?: boolean;
    hotkeys?: HotkeyItem[];
    title?: string;
    description?: string;
    enableGlobalTrigger?: boolean;
    platform?: 'auto' | 'mac' | 'windows';
    class?: string;
    onOpenChange?: (open: boolean) => void;
  }

  let {
    open = $bindable(false),
    hotkeys = [
      { id: '1', name: '打开全局命令栏', keys: ['Meta', 'K'], category: '全局导航', description: '快速搜索系统资源与功能' },
      { id: '2', name: '唤醒快捷键指引', keys: ['?'], category: '全局导航', description: '查看系统所有快捷键' },
      { id: '3', name: '返回上一级 / 关闭', keys: ['Escape'], category: '全局导航', description: '关闭弹窗或取消当前焦点' },
      { id: '4', name: '刷新表格数据', keys: ['Meta', 'R'], category: '表格与视图', description: '重新加载当前视图记录' },
      { id: '5', name: '批量选中所有行', keys: ['Meta', 'A'], category: '表格与视图', description: '全选表格当前页数据' },
      { id: '6', name: '保存表单 / 提交', keys: ['Meta', 'S'], category: '表单与编辑', description: '保存当前正在编辑的记录' },
      { id: '7', name: '撤销编辑', keys: ['Meta', 'Z'], category: '表单与编辑', description: '恢复至上一步状态' },
      { id: '8', name: '重做编辑', keys: ['Meta', 'Shift', 'Z'], category: '表单与编辑', description: '重做已被撤销的操作' },
    ],
    title = '快捷键指引 (Keyboard Shortcuts)',
    description = '使用键盘快捷键可以极大提升日常操作与数据录入效能',
    enableGlobalTrigger = true,
    platform = 'auto',
    class: className = '',
    onOpenChange,
  }: HotkeysHelpModalProps = $props();

  let searchQuery = $state<string>('');
  let selectedCategory = $state<string>('all');
  let isMac = $state<boolean>(false);

  onMount(() => {
    if (platform === 'mac') {
      isMac = true;
    } else if (platform === 'windows') {
      isMac = false;
    } else if (typeof navigator !== 'undefined') {
      isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    }
  });

  const categories = $derived(() => {
    const set = new Set<string>();
    for (const h of hotkeys) {
      if (h.category) {
        set.add(h.category);
      }
    }
    return Array.from(set);
  });

  const filteredHotkeys = $derived(() => {
    let list = hotkeys;
    if (selectedCategory !== 'all') {
      list = list.filter((item) => item.category === selectedCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
      const matchCategory = item.category?.toLowerCase().includes(q) ?? false;
      const matchKeys = item.keys.some((k) => k.toLowerCase().includes(q));
      return matchName || matchDesc || matchCategory || matchKeys;
    });
  });

  const groupedHotkeys = $derived(() => {
    const map = new Map<string, HotkeyItem[]>();
    for (const item of filteredHotkeys()) {
      const cat = item.category || '通用快捷键';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  });

  function setOpen(val: boolean) {
    open = val;
    onOpenChange?.(val);
    if (!val) {
      searchQuery = '';
    }
  }

  function handleWindowKeydown(e: KeyboardEvent) {
    // Escape closes modal
    if (e.key === 'Escape' && open) {
      setOpen(false);
      return;
    }

    if (!enableGlobalTrigger || open) return;

    // Check if user is typing in an input/textarea/editable
    const target = e.target as HTMLElement | null;
    const isEditing =
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.isContentEditable;

    if (isEditing) return;

    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      setOpen(true);
    }
  }

  function formatKey(key: string): string {
    const lower = key.toLowerCase();
    if (isMac) {
      if (lower === 'meta' || lower === 'cmd' || lower === 'command') return '⌘';
      if (lower === 'alt' || lower === 'opt' || lower === 'option') return '⌥';
      if (lower === 'shift') return '⇧';
      if (lower === 'ctrl' || lower === 'control') return '⌃';
      if (lower === 'enter' || lower === 'return') return '↵';
      if (lower === 'backspace') return '⌫';
      if (lower === 'escape' || lower === 'esc') return 'Esc';
      if (lower === 'tab') return '⇥';
      if (lower === 'arrowup') return '↑';
      if (lower === 'arrowdown') return '↓';
      if (lower === 'arrowleft') return '←';
      if (lower === 'arrowright') return '→';
    } else {
      if (lower === 'meta' || lower === 'cmd' || lower === 'win') return 'Win';
      if (lower === 'alt' || lower === 'option') return 'Alt';
      if (lower === 'shift') return 'Shift';
      if (lower === 'ctrl' || lower === 'control') return 'Ctrl';
      if (lower === 'enter' || lower === 'return') return 'Enter';
      if (lower === 'backspace') return 'Backspace';
      if (lower === 'escape' || lower === 'esc') return 'Esc';
      if (lower === 'tab') return 'Tab';
      if (lower === 'arrowup') return '↑';
      if (lower === 'arrowdown') return '↓';
      if (lower === 'arrowleft') return '←';
      if (lower === 'arrowright') return '→';
    }
    return key;
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if open}
  <div
    class="hotkeys-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm transition-all"
    role="dialog"
    aria-modal="true"
    aria-labelledby="hotkeys-modal-title"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && setOpen(false)}
    onkeydown={(e) => e.key === 'Escape' && setOpen(false)}
  >
    <div
      class="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl {className}"
      data-svadmin-component="HotkeysHelpModal"
    >
      <!-- Modal Header -->
      <div class="flex items-start justify-between border-b border-border/60 p-5">
        <div>
          <h2 id="hotkeys-modal-title" class="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p class="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          onclick={() => setOpen(false)}
          title="关闭 (Esc)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <!-- Search & Category Filters -->
      <div class="space-y-3 border-b border-border/60 bg-muted/20 p-4">
        <!-- Search Input -->
        <div class="relative">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            bind:value={searchQuery}
            placeholder="搜索快捷键或功能名称..."
            class="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-ring"
          />
        </div>

        <!-- Category Tabs -->
        {#if categories().length > 0}
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors {selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}"
              onclick={() => (selectedCategory = 'all')}
            >
              全部 ({hotkeys.length})
            </button>
            {#each categories() as cat (cat)}
              {@const count = hotkeys.filter((h) => h.category === cat).length}
              <button
                type="button"
                class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors {selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}"
                onclick={() => (selectedCategory = cat)}
              >
                {cat} ({count})
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Hotkeys Group List -->
      <div class="flex-1 space-y-6 overflow-y-auto p-5">
        {#if groupedHotkeys().length === 0}
          <div class="py-12 text-center">
            <p class="text-xs text-muted-foreground">未找到匹配的键盘快捷键</p>
          </div>
        {:else}
          {#each groupedHotkeys() as [category, items] (category)}
            <div>
              <h3 class="mb-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                {category}
              </h3>
              <div class="divide-y divide-border/40 rounded-xl border border-border bg-card">
                {#each items as item (item.id)}
                  <div class="flex items-center justify-between gap-4 p-3 transition-colors hover:bg-muted/30">
                    <div class="min-w-0 flex-1">
                      <div class="text-xs font-medium text-foreground">{item.name}</div>
                      {#if item.description}
                        <div class="text-[11px] text-muted-foreground">{item.description}</div>
                      {/if}
                    </div>

                    <!-- Keyboard badges -->
                    <div class="flex shrink-0 items-center gap-1.5">
                      {#each item.keys as k, ki (ki)}
                        <kbd class="inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-md border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground shadow-xs">
                          {formatKey(k)}
                        </kbd>
                        {#if ki < item.keys.length - 1}
                          <span class="text-[10px] text-muted-foreground">+</span>
                        {/if}
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer Help Hint -->
      <div class="flex items-center justify-between border-t border-border/60 bg-muted/10 px-5 py-3 text-[11px] text-muted-foreground">
        <span>在任意页面按下 <kbd class="rounded border border-border bg-muted px-1 font-mono font-medium text-foreground">?</kbd> 即可重新打开此面板</span>
        <span>当前识别平台: {isMac ? 'macOS (⌘)' : 'Windows/Linux (Ctrl)'}</span>
      </div>
    </div>
  </div>
{/if}
