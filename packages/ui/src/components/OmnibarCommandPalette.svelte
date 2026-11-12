<script lang="ts">
    import {
    Search,
    Command,
    Sparkles,
    FileText,
    ArrowRight,
    CornerDownLeft,
    Zap,
    X,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface CommandPaletteItem {
    id: string;
    title: string;
    category?: 'navigation' | 'actions' | 'resources' | 'recent' | 'ai' | string | undefined;
    categoryLabel?: string | undefined;
    description?: string | undefined;
    shortcut?: string | undefined;
    badge?: string | undefined;
    danger?: boolean | undefined;
    keywords?: string[] | undefined;
    handler?: (() => void | Promise<void>) | undefined;
  }

  export interface OmnibarCommandPaletteProps {
    open?: boolean | undefined;
    shortcutKey?: string | undefined;
    placeholder?: string | undefined;
    emptyText?: string | undefined;
    items?: CommandPaletteItem[] | undefined;
    recentItemIds?: string[] | undefined;
    enableAiSuggestions?: boolean | undefined;
    class?: string | undefined;
    onSelect?: ((item: CommandPaletteItem) => void) | undefined;
    onClose?: (() => void) | undefined;
  }

  let {
    open = $bindable(false),
    shortcutKey = 'k',
    placeholder = '输入命令、查找页面或搜索实体资源... (⌘K)',
    emptyText = '未找到匹配的命令或资源',
    items = [
      { id: 'nav-dashboard', title: '运营与财务仪表盘', category: 'navigation', categoryLabel: '系统导航', description: '高管大屏与实时多维指标看板', shortcut: 'G D' },
      { id: 'nav-users', title: '用户与组织架构管理', category: 'navigation', categoryLabel: '系统导航', description: '多租户员工、部门与岗位授权', shortcut: 'G U' },
      { id: 'nav-audit', title: '安全审计与合规追溯', category: 'navigation', categoryLabel: '系统导航', description: '数据变更前/后对比与高危命令日志', shortcut: 'G A' },
      { id: 'act-new-order', title: '新建采购审批流', category: 'actions', categoryLabel: '快捷操作', description: '发起大额资金划转与双人复核工单', shortcut: '⌘ N', badge: '审批' },
      { id: 'act-export', title: '导出全量报表数据', category: 'actions', categoryLabel: '快捷操作', description: '按脱敏合规格式生成 CSV / XLSX', shortcut: '⌘ E' },
      { id: 'res-order-88', title: '订单 #ORD-2026-9882 (未结算)', category: 'resources', categoryLabel: '业务实体', description: '金额 ¥48,200 · 客户: 华东智能电网', badge: '进行中' },
      { id: 'res-cust-12', title: '客户: 智汇能源物联科技有限公司', category: 'resources', categoryLabel: '业务实体', description: '战略级签约企业 · 租户代码: CUST-ZH01' },
      { id: 'ai-explain', title: 'AI 智能规则解读', category: 'ai', categoryLabel: '智能助手', description: '将当前复杂 SQL 或筛选表达式解释为白话', badge: 'AI' },
    ],
    class: className = '',
    onSelect,
    onClose,
  }: OmnibarCommandPaletteProps = $props();

  let query = $state('');
  let selectedCategory = $state<'all' | 'navigation' | 'actions' | 'resources' | 'ai'>('all');
  let selectedIndex = $state(0);
  let inputElement: HTMLInputElement | null = $state(null);

  // 快捷键全局监听
  function handleWindowKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === shortcutKey.toLowerCase()) {
      e.preventDefault();
      open = !open;
      return;
    }

    if (!open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredItems.length > 0) {
        selectedIndex = (selectedIndex + 1) % filteredItems.length;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredItems.length > 0) {
        selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedItem = filteredItems[selectedIndex];
      if (selectedItem) {
        executeItem(selectedItem);
      }
    }
  }

  $effect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleWindowKeyDown);
      return () => {
        window.removeEventListener('keydown', handleWindowKeyDown);
      };
    }
  });

  $effect(() => {
    if (open) {
      selectedIndex = 0;
      query = '';
      setTimeout(() => {
        inputElement?.focus();
      }, 50);
    }
  });

  let filteredItems = $derived(
    items.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
      return matchTitle || matchDesc || matchKeywords;
    })
  );

  function executeItem(item: CommandPaletteItem) {
    onSelect?.(item);
    item.handler?.();
    closePalette();
  }

  function closePalette() {
    open = false;
    onClose?.();
  }

  function getCategoryIcon(category?: string) {
    switch (category) {
      case 'navigation':
        return ArrowRight;
      case 'actions':
        return Zap;
      case 'resources':
        return FileText;
      case 'ai':
        return Sparkles;
      default:
        return Command;
    }
  }
</script>

{#if open}
  <!-- 模态背景遮罩 -->
  <div
    class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-all duration-200"
    onclick={closePalette}
    aria-hidden="true"
  ></div>

  <!-- 命令面板浮窗 -->
  <div
    class={cn(
      'fixed left-1/2 top-[16%] -translate-x-1/2 z-50 w-full max-w-2xl rounded-2xl border border-border bg-card text-foreground shadow-2xl overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-150',
      className
    )}
    role="dialog"
    aria-modal="true"
    aria-label="全局快捷命令面板"
    data-svadmin-component="omnibar-command-palette"
  >
    <!-- 输入栏 -->
    <div class="relative flex items-center px-4 py-3 border-b border-border bg-muted/20">
      <Search class="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
      <input
        bind:this={inputElement}
        type="text"
        bind:value={query}
        {placeholder}
        class="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      {#if query}
        <button
          type="button"
          class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          onclick={() => (query = '')}
        >
          <X class="w-4 h-4" />
        </button>
      {:else}
        <kbd class="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono text-muted-foreground bg-muted border border-border rounded">
          ESC
        </kbd>
      {/if}
    </div>

    <!-- 分类快速筛选 Chips -->
    <div class="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/60 bg-muted/10 text-xs overflow-x-auto">
      {#each [
        { id: 'all', label: '全部' },
        { id: 'actions', label: '快捷操作' },
        { id: 'navigation', label: '导航' },
        { id: 'resources', label: '实体资源' },
        { id: 'ai', label: 'AI 智语' },
      ] as cat (cat.id)}
        <button
          type="button"
          class={cn(
            'px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 text-xs',
            selectedCategory === cat.id
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
          onclick={() => (selectedCategory = cat.id as 'all' | 'actions' | 'navigation' | 'resources' | 'ai')}
        >
          {cat.label}
        </button>
      {/each}
    </div>

    <!-- 结果项列表 -->
    <div class="max-h-[380px] overflow-y-auto p-2 space-y-1">
      {#if filteredItems.length === 0}
        <div class="py-12 text-center text-sm text-muted-foreground">
          <Command class="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>{emptyText}</p>
        </div>
      {:else}
        {#each filteredItems as item, idx (item.id)}
          {@const isSelected = idx === selectedIndex}
          {@const ItemIcon = getCategoryIcon(item.category)}
          <button
            type="button"
            class={cn(
              'w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors',
              isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'
            )}
            onmouseenter={() => (selectedIndex = idx)}
            onclick={() => executeItem(item)}
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                class={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg border shrink-0',
                  isSelected
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'bg-muted/50 text-muted-foreground border-border'
                )}
              >
                <ItemIcon class="w-4 h-4" />
              </div>

              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2">
                  <span class={cn('text-sm font-medium truncate', isSelected ? 'text-primary' : 'text-foreground')}>
                    {item.title}
                  </span>
                  {#if item.badge}
                    <span class="text-[10px] px-1.5 py-0.2 rounded border border-primary/20 bg-primary/10 text-primary font-medium shrink-0">
                      {item.badge}
                    </span>
                  {/if}
                  {#if item.categoryLabel}
                    <span class="text-[10px] text-muted-foreground shrink-0">
                      · {item.categoryLabel}
                    </span>
                  {/if}
                </div>
                {#if item.description}
                  <p class="text-xs text-muted-foreground truncate mt-0.5">
                    {item.description}
                  </p>
                {/if}
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0 ml-3">
              {#if item.shortcut}
                <kbd class="px-2 py-0.5 text-[11px] font-mono text-muted-foreground bg-muted border border-border rounded">
                  {item.shortcut}
                </kbd>
              {/if}
              {#if isSelected}
                <CornerDownLeft class="w-4 h-4 text-primary" />
              {/if}
            </div>
          </button>
        {/each}
      {/if}
    </div>

    <!-- 底部快捷提示栏 -->
    <div class="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
      <div class="flex items-center gap-3">
        <span class="flex items-center gap-1">
          <kbd class="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px]">↑</kbd>
          <kbd class="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px]">↓</kbd>
          导航
        </span>
        <span class="flex items-center gap-1">
          <kbd class="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px]">↵</kbd>
          选择执行
        </span>
        <span class="flex items-center gap-1">
          <kbd class="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px]">ESC</kbd>
          退出
        </span>
      </div>

      <div class="flex items-center gap-1 font-medium text-foreground">
        <Sparkles class="w-3.5 h-3.5 text-primary" />
        <span>支持全局命令 & 业务检索</span>
      </div>
    </div>
  </div>
{/if}
