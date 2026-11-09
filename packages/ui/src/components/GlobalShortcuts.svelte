<script lang="ts">
  import { onMount } from 'svelte';
  import { Keyboard, Search, X } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core';
  import { cn } from '../utils.js';

  export interface ShortcutItem {
    id: string;
    category: 'navigation' | 'view' | 'action' | 'system';
    label: string;
    keys: string[];
    description?: string;
    action?: () => void;
  }

  interface Props {
    open?: boolean;
    shortcuts?: ShortcutItem[];
    enableBuiltins?: boolean;
    class?: string;
    onAction?: (shortcutId: string) => void;
  }

  let {
    open = $bindable(false),
    shortcuts = [],
    enableBuiltins = true,
    class: className = '',
    onAction,
  }: Props = $props();

  const i18n = useTranslation();
  let query = $state('');

  const defaultShortcuts: ShortcutItem[] = [
    {
      id: 'command-palette',
      category: 'navigation',
      label: '全局搜索 / 命令面板',
      keys: ['⌘ / Ctrl', 'K'],
      description: '快速定位资源、页面与菜单',
    },
    {
      id: 'toggle-lock',
      category: 'system',
      label: '会话安全锁屏',
      keys: ['Alt', 'L'],
      description: '离开工位时快速锁定当前会话',
    },
    {
      id: 'toggle-fullscreen',
      category: 'view',
      label: '全屏模式切换',
      keys: ['F11'],
      description: '展开全屏或退出全屏',
    },
    {
      id: 'toggle-theme',
      category: 'view',
      label: '切换主题外观',
      keys: ['Alt', 'T'],
      description: '在浅色与深色主题间切换',
    },
    {
      id: 'shortcuts-help',
      category: 'system',
      label: '打开快捷键向导',
      keys: ['?'],
      description: '查看当前系统全部可用快捷键',
    },
  ];

  const allShortcuts = $derived(enableBuiltins ? [...defaultShortcuts, ...shortcuts] : shortcuts);

  const filteredShortcuts = $derived.by(() => {
    if (!query.trim()) return allShortcuts;
    const q = query.toLowerCase();
    return allShortcuts.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q)),
    );
  });

  const categories: Record<string, string> = {
    navigation: '导航与检索',
    view: '视图与外观',
    action: '数据操作',
    system: '系统安全',
  };

  const groupedShortcuts = $derived.by(() => {
    const groups: Record<string, ShortcutItem[]> = {};
    for (const item of filteredShortcuts) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  });

  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const isEditing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    // 按 ? (Shift + /) 且非编辑状态唤出帮助面板
    if (event.key === '?' && !isEditing) {
      event.preventDefault();
      open = !open;
      return;
    }

    // Cmd + / 或 Ctrl + /
    if ((event.metaKey || event.ctrlKey) && event.key === '/') {
      event.preventDefault();
      open = !open;
      return;
    }

    if (open && event.key === 'Escape') {
      event.preventDefault();
      open = false;
    }
  }

  function triggerItem(item: ShortcutItem) {
    item.action?.();
    onAction?.(item.id);
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

{#if open}
  <div
    data-svadmin-component="global-shortcuts"
    class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs select-none"
    role="dialog"
    aria-modal="true"
    aria-label={i18n.t('common.shortcutsHelp')}
  >
    <div
      class={cn(
        'relative flex flex-col w-full max-w-xl max-h-[85vh] rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden',
        className,
      )}
    >
      <!-- 头部 -->
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <div class="flex items-center gap-2">
          <Keyboard class="h-5 w-5 text-primary" />
          <h2 class="text-base font-semibold">{i18n.t('common.shortcutsHelp')}</h2>
        </div>
        <button
          type="button"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onclick={() => (open = false)}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <!-- 搜索过滤栏 -->
      <div class="px-6 py-3 border-b border-border/50 bg-muted/30">
        <div class="relative flex items-center">
          <Search size={16} class="absolute left-3 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            bind:value={query}
            placeholder="搜索快捷键..."
            class="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-2xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <!-- 快捷键列表 -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {#each Object.entries(groupedShortcuts) as [categoryKey, items] (categoryKey)}
          <div class="space-y-2.5">
            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {categories[categoryKey] || categoryKey}
            </div>
            <div class="space-y-1.5">
              {#each items as item (item.id)}
                <div
                  class="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent/50 cursor-pointer"
                  onclick={() => triggerItem(item)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => e.key === 'Enter' && triggerItem(item)}
                >
                  <div class="flex flex-col">
                    <span class="font-medium text-foreground">{item.label}</span>
                    {#if item.description}
                      <span class="text-xs text-muted-foreground">{item.description}</span>
                    {/if}
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    {#each item.keys as key, keyIdx (keyIdx)}
                      <kbd class="inline-flex min-w-6 h-6 items-center justify-center rounded-md border border-border bg-muted px-1.5 text-xs font-mono font-medium text-muted-foreground shadow-2xs">
                        {key}
                      </kbd>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}

        {#if filteredShortcuts.length === 0}
          <div class="text-center py-8 text-sm text-muted-foreground">未找到匹配的快捷键</div>
        {/if}
      </div>

      <!-- 底部提示 -->
      <div class="border-t border-border px-6 py-3 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
        <span>按 <kbd class="px-1 py-0.5 rounded bg-muted border text-[10px]">Esc</kbd> 退出向导</span>
        <span>按 <kbd class="px-1 py-0.5 rounded bg-muted border text-[10px]">?</kbd> 随时唤出</span>
      </div>
    </div>
  </div>
{/if}
