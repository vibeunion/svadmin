<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { Keyboard, Search, X, Command } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { getRegisteredHotkeys, isMac, useHotkeys } from './useHotkeys.svelte.js';

  export interface KeyboardShortcutEntry {
    id: string;
    category: 'navigation' | 'table' | 'action' | 'view' | 'system' | string;
    label: string;
    keys: string[];
    description?: string | undefined;
    action?: (() => void) | undefined;
  }

  export interface KeyboardShortcutsModalProps {
    open?: boolean | undefined;
    shortcuts?: KeyboardShortcutEntry[] | undefined;
    includeBuiltins?: boolean | undefined;
    includeRegistered?: boolean | undefined;
    enableGlobalTrigger?: boolean | undefined;
    title?: string | undefined;
    subtitle?: string | undefined;
    class?: string | undefined;
    onAction?: ((shortcutId: string) => void) | undefined;
  }

  let {
    open = $bindable(false),
    shortcuts = [],
    includeBuiltins = true,
    includeRegistered = true,
    enableGlobalTrigger = true,
    title,
    subtitle,
    class: className = '',
    onAction,
  }: KeyboardShortcutsModalProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));
  const mac = $derived(isMac());
  const modSymbol = $derived(mac ? '⌘' : 'Ctrl');

  let query = $state('');
  let searchInputRef = $state<HTMLInputElement | null>(null);
  let registeredSnapshot = $state<KeyboardShortcutEntry[]>([]);

  const builtinShortcuts = $derived<KeyboardShortcutEntry[]>([
    {
      id: 'command-palette',
      category: 'navigation',
      label: chinese ? '全局搜索 / 命令面板' : 'Command Palette / Global Search',
      keys: [modSymbol, 'K'],
      description: chinese ? '快速跳转资源、菜单与动作' : 'Quickly jump to resources, pages, and actions',
    },
    {
      id: 'shortcuts-help',
      category: 'system',
      label: chinese ? '打开快捷键总览' : 'Keyboard Shortcuts Matrix',
      keys: ['?'],
      description: chinese ? '显示或隐藏当前快捷键帮助矩阵' : 'Toggle the keyboard shortcuts overview modal',
    },
    {
      id: 'form-save',
      category: 'action',
      label: chinese ? '保存当前表单' : 'Save Current Form',
      keys: [modSymbol, 'S'],
      description: chinese ? '在创建或编辑页面触发提交保存' : 'Submit or save active edit/create form',
    },
    {
      id: 'table-next-row',
      category: 'table',
      label: chinese ? '表格下一行' : 'Next Table Row',
      keys: ['J'],
      description: chinese ? '在数据表格中向下移动行焦点' : 'Move row selection down in tables',
    },
    {
      id: 'table-prev-row',
      category: 'table',
      label: chinese ? '表格上一行' : 'Previous Table Row',
      keys: ['K'],
      description: chinese ? '在数据表格中向上移动行焦点' : 'Move row selection up in tables',
    },
    {
      id: 'table-search',
      category: 'table',
      label: chinese ? '聚焦表格筛选' : 'Focus Table Filter',
      keys: [modSymbol, 'F'],
      description: chinese ? '快速将光标定位至列表过滤搜索框' : 'Focus list search or filter input',
    },
    {
      id: 'toggle-theme',
      category: 'view',
      label: chinese ? '切换浅色 / 深色模式' : 'Toggle Dark Mode',
      keys: [modSymbol, 'D'],
      description: chinese ? '在亮色与暗色主题外观间切换' : 'Switch between light and dark appearance',
    },
    {
      id: 'toggle-fullscreen',
      category: 'view',
      label: chinese ? '全屏工作区切换' : 'Toggle Fullscreen',
      keys: ['F11'],
      description: chinese ? '沉浸式全屏展开或恢复' : 'Enter or exit fullscreen workspace mode',
    },
    {
      id: 'cancel-close',
      category: 'system',
      label: chinese ? '取消 / 关闭浮层' : 'Cancel / Close Dialog',
      keys: ['Esc'],
      description: chinese ? '关闭当前抽屉、弹窗或取消编辑' : 'Close active modal, drawer, or cancel edit',
    },
  ]);

  function refreshRegistered() {
    if (!includeRegistered) {
      registeredSnapshot = [];
      return;
    }
    registeredSnapshot = getRegisteredHotkeys().map((item) => ({
      id: item.id,
      category: item.category ?? 'action',
      label: item.label ?? item.combo,
      keys: item.keys,
      description: item.description,
      action: item.action,
    }));
  }

  $effect(() => {
    if (open) {
      refreshRegistered();
      void tick().then(() => {
        searchInputRef?.focus();
      });
    } else {
      query = '';
    }
  });

  const allShortcuts = $derived.by(() => {
    const merged: KeyboardShortcutEntry[] = [];
    if (includeBuiltins) merged.push(...builtinShortcuts);
    if (includeRegistered) merged.push(...registeredSnapshot);
    merged.push(...shortcuts);
    return merged;
  });

  const filteredShortcuts = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allShortcuts;
    return allShortcuts.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q)),
    );
  });

  const categoryLabels = $derived<Record<string, string>>({
    navigation: chinese ? '导航与检索' : 'Navigation',
    table: chinese ? '表格与列表' : 'Table & List',
    action: chinese ? '编辑与操作' : 'Editing & Actions',
    view: chinese ? '视图与外观' : 'View & Theme',
    system: chinese ? '系统与安全' : 'System & Safety',
  });

  const groupedShortcuts = $derived.by(() => {
    const groups: Record<string, KeyboardShortcutEntry[]> = {};
    for (const item of filteredShortcuts) {
      const cat = item.category || 'action';
      const bucket = groups[cat] ?? (groups[cat] = []);
      bucket.push(item);
    }
    return groups;
  });

  function triggerItem(item: KeyboardShortcutEntry) {
    item.action?.();
    onAction?.(item.id);
  }

  let cleanupTrigger: (() => void) | undefined;
  let cleanupEsc: (() => void) | undefined;

  onMount(() => {
    if (enableGlobalTrigger) {
      const h1 = useHotkeys(
        ['?', 'Shift+?', 'Mod+/'],
        () => {
          open = !open;
        },
        { preventDefault: true },
      );
      cleanupTrigger = h1.destroy;
    }

    const h2 = useHotkeys(
      'Escape',
      () => {
        if (open) open = false;
      },
      {
        enabled: () => open,
        enableOnInputs: true,
        preventDefault: true,
      },
    );
    cleanupEsc = h2.destroy;
  });

  onDestroy(() => {
    cleanupTrigger?.();
    cleanupEsc?.();
  });

  const resolvedTitle = $derived(
    title ?? (chinese ? '全局快捷键总览' : 'Keyboard Shortcuts'),
  );
  const resolvedSubtitle = $derived(
    subtitle ??
      (chinese
        ? 'Linear / macOS 风格企业级高效键盘导航矩阵'
        : 'Productivity-first keyboard matrix across workspace navigation and forms'),
  );
</script>

{#if open}
  <div
    data-svadmin-component="KeyboardShortcutsModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm select-none"
    role="dialog"
    aria-modal="true"
    aria-label={resolvedTitle}
  >
    <!-- Backdrop click to close -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      role="button"
      tabindex="-1"
      class="fixed inset-0"
      onclick={() => (open = false)}
      aria-label="Close shortcuts modal"
    ></div>

    <div
      class={cn(
        'relative z-10 flex flex-col w-full max-w-3xl max-h-[85vh] rounded-md border border-border bg-card text-card-foreground shadow-[var(--shadow-overlay)] overflow-hidden',
        className,
      )}
    >
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-border px-6 py-4 bg-card">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary border border-primary/20">
            <Keyboard class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-foreground">{resolvedTitle}</h2>
            <p class="text-xs text-muted-foreground mt-0.5">{resolvedSubtitle}</p>
          </div>
        </div>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onclick={() => (open = false)}
          aria-label="Close"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Search Filter Bar -->
      <div class="px-6 py-3 border-b border-border/60 bg-muted/30">
        <div class="relative flex items-center">
          <Search class="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            bind:this={searchInputRef}
            type="text"
            bind:value={query}
            placeholder={chinese ? '搜索快捷键名称、描述或按键 (如 Mod+S, J/K)...' : 'Search shortcuts by action, category, or key...'}
            class="flex h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {#if query}
            <button
              type="button"
              onclick={() => (query = '')}
              class="absolute right-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          {/if}
        </div>
      </div>

      <!-- Categorized Matrix Grid -->
      <div class="flex-1 overflow-y-auto px-6 py-5">
        {#if filteredShortcuts.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {#each Object.entries(groupedShortcuts) as [categoryKey, items] (categoryKey)}
              <div class="space-y-2.5">
                <div class="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  <Command class="h-3 w-3 text-primary/70" />
                  <span>{categoryLabels[categoryKey] ?? categoryKey}</span>
                </div>
                <div class="rounded-md border border-border/70 bg-muted/15 divide-y divide-border/50 overflow-hidden">
                  {#each items as item (item.id)}
                    <div
                      class="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-accent/50 cursor-pointer"
                      onclick={() => triggerItem(item)}
                      role="button"
                      tabindex="0"
                      onkeydown={(e) => e.key === 'Enter' && triggerItem(item)}
                    >
                      <div class="min-w-0 flex-1">
                        <div class="font-medium text-foreground text-xs truncate">{item.label}</div>
                        {#if item.description}
                          <div class="text-[11px] text-muted-foreground truncate mt-0.5">{item.description}</div>
                        {/if}
                      </div>
                      <div class="flex items-center gap-1 shrink-0">
                        {#each item.keys as key, keyIdx (keyIdx)}
                          <kbd class="inline-flex min-w-6 h-6 items-center justify-center rounded-md border border-border bg-background px-1.5 text-[11px] font-mono font-medium text-foreground shadow-2xs">
                            {key}
                          </kbd>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-12 text-sm text-muted-foreground">
            {chinese ? '未找到匹配的快捷键' : 'No matching keyboard shortcuts found'}
          </div>
        {/if}
      </div>

      <!-- Footer Hint -->
      <div class="border-t border-border px-6 py-3 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {chinese ? '在输入框内仅屏蔽单字符热键，组合键 (如 ⌘S) 始终生效' : 'Bare single-key shortcuts pause in inputs; modifier combos remain active'}
        </span>
        <div class="flex items-center gap-3">
          <span>
            <kbd class="px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono">?</kbd>
            {chinese ? ' 呼出' : ' Toggle'}
          </span>
          <span>
            <kbd class="px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono">Esc</kbd>
            {chinese ? ' 关闭' : ' Close'}
          </span>
        </div>
      </div>
    </div>
  </div>
{/if}
