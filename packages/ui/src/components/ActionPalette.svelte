<script lang="ts">
  import { tick } from 'svelte';
  import {
    Command,
    Search,
    CornerDownLeft,
    X,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface PaletteActionItem {
    id: string;
    label: string;
    category?: string | undefined;
    shortcut?: string | undefined;
    description?: string | undefined;
    danger?: boolean | undefined;
    requiresParam?: boolean | undefined;
    paramPlaceholder?: string | undefined;
    handler?: ((selectedRecords: Record<string, unknown>[], param?: string) => void | Promise<void>) | undefined;
  }

  export interface ActionPaletteProps {
    open?: boolean | undefined;
    selectedRecords?: Record<string, unknown>[] | undefined;
    actions?: PaletteActionItem[] | undefined;
    placeholder?: string | undefined;
    class?: string | undefined;
    onExecuteAction?: ((actionId: string, param?: string) => void) | undefined;
    onClose?: (() => void) | undefined;
  }

  let {
    open = $bindable(false),
    selectedRecords = [],
    actions = [
      { id: 'assign', label: '批量指派负责人', category: '流转', shortcut: 'A', requiresParam: true, paramPlaceholder: '输入被指派人姓名/工号' },
      { id: 'expedite', label: '标记加急处理', category: '操作', shortcut: 'E', description: '提升工单与审批优先级' },
      { id: 'verify', label: '核验通过', category: '审核', shortcut: 'V', description: '批量移入已核验状态' },
      { id: 'reject', label: '批量驳回', category: '审核', shortcut: 'R', danger: true, requiresParam: true, paramPlaceholder: '填写驳回原因' },
      { id: 'tag', label: '添加业务标签', category: '操作', shortcut: 'T', requiresParam: true, paramPlaceholder: '标签名称' },
    ],
    placeholder,
    class: className = '',
    onExecuteAction,
    onClose,
  }: ActionPaletteProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let query = $state('');
  let selectedIndex = $state(0);
  let pendingAction = $state<PaletteActionItem | null>(null);
  let paramValue = $state('');
  let searchInput = $state<HTMLInputElement | null>(null);
  let paramInput = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (open) {
      query = '';
      selectedIndex = 0;
      pendingAction = null;
      paramValue = '';
      void tick().then(() => searchInput?.focus());
    }
  });

  const filteredActions = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.shortcut?.toLowerCase().includes(q),
    );
  });

  function selectAction(action: PaletteActionItem) {
    if (action.requiresParam) {
      pendingAction = action;
      paramValue = '';
      void tick().then(() => paramInput?.focus());
    } else {
      executeAction(action);
    }
  }

  function executeAction(action: PaletteActionItem, param?: string) {
    action.handler?.(selectedRecords, param);
    onExecuteAction?.(action.id, param);
    open = false;
    onClose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (pendingAction) {
        pendingAction = null;
        void tick().then(() => searchInput?.focus());
      } else {
        open = false;
        onClose?.();
      }
      return;
    }

    if (pendingAction) {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeAction(pendingAction, paramValue);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % Math.max(1, filteredActions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + filteredActions.length) % Math.max(1, filteredActions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredActions[selectedIndex];
      if (current) selectAction(current);
    }
  }

  const resolvedPlaceholder = $derived(
    placeholder ?? (chinese ? '输入动作名称、拼音首字母或按键 (如 ⌘. 呼出)...' : 'Type action name or shortcut...'),
  );
</script>

{#if open}
  <div
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Action Palette"
    data-svadmin-component="ActionPalette"
    class="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-background/80 backdrop-blur-sm"
    onkeydown={handleKeydown}
  >
    <!-- Modal Box -->
    <div
      class={cn(
        'relative z-10 w-full max-w-xl rounded-md border border-border bg-card text-card-foreground shadow-[var(--shadow-overlay)] overflow-hidden animate-in fade-in zoom-in-95 duration-100',
        className,
      )}
    >
      <!-- Mode 1: Action Search -->
      {#if !pendingAction}
        <!-- Search Input Bar -->
        <div class="flex items-center gap-3 border-b border-border/70 px-4 py-3 bg-card">
          <Search class="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            bind:this={searchInput}
            type="text"
            bind:value={query}
            placeholder={resolvedPlaceholder}
            class="h-7 w-full bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none"
          />
          {#if selectedRecords.length > 0}
            <span class="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary shrink-0">
              {chinese ? `已选 ${selectedRecords.length} 项` : `${selectedRecords.length} selected`}
            </span>
          {/if}
          <button
            type="button"
            onclick={() => { open = false; onClose?.(); }}
            class="text-muted-foreground hover:text-foreground"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Action Items List -->
        <div class="max-h-72 overflow-y-auto p-2 space-y-1">
          {#each filteredActions as action, idx (action.id)}
            {@const isSelected = idx === selectedIndex}
            <div
              role="button"
              tabindex="0"
              onclick={() => selectAction(action)}
              onkeydown={(e) => e.key === 'Enter' && selectAction(action)}
              onmouseenter={() => (selectedIndex = idx)}
              class={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer',
                isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-foreground',
                action.danger && !isSelected && 'text-destructive',
              )}
            >
              <div class="flex items-center gap-2.5 truncate">
                <Command class="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span class="font-semibold">{action.label}</span>
                {#if action.description}
                  <span class={cn('text-[11px] truncate', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                    {action.description}
                  </span>
                {/if}
              </div>

              <div class="flex items-center gap-2 shrink-0">
                {#if action.category}
                  <span class={cn('rounded px-1.5 py-0.5 text-xs uppercase font-mono', isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {action.category}
                  </span>
                {/if}
                {#if action.shortcut}
                  <kbd class={cn('rounded px-1.5 py-0.5 text-xs font-mono font-bold border', isSelected ? 'bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground' : 'bg-background border-border text-foreground')}>
                    {action.shortcut}
                  </kbd>
                {/if}
              </div>
            </div>
          {/each}

          {#if filteredActions.length === 0}
            <div class="py-8 text-center text-xs text-muted-foreground">
              {chinese ? '未找到匹配动作' : 'No matching actions'}
            </div>
          {/if}
        </div>
      {:else}
        <!-- Mode 2: Parameter Inline Prompt -->
        <div class="p-5 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span class="text-primary font-bold">{pendingAction.label}</span>
              <span class="text-muted-foreground">· {chinese ? '请输入参数' : 'Parameter required'}</span>
            </div>
            <button
              type="button"
              onclick={() => (pendingAction = null)}
              class="text-xs text-muted-foreground hover:text-foreground"
            >
              Esc {chinese ? '返回' : 'Back'}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <input
              bind:this={paramInput}
              type="text"
              bind:value={paramValue}
              placeholder={pendingAction.paramPlaceholder ?? (chinese ? '输入执行参数...' : 'Enter parameter...')}
              class="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button
              size="sm"
              class="h-9 px-3 gap-1 shrink-0"
              onclick={() => pendingAction && executeAction(pendingAction, paramValue)}
            >
              <span>{chinese ? '执行' : 'Run'}</span>
              <CornerDownLeft class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      {/if}

      <!-- Footer Hints -->
      <div class="border-t border-border/60 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between font-mono">
        <span>↑↓ {chinese ? '切换' : 'Navigate'} · ↵ {chinese ? '确认执行' : 'Select'}</span>
        <span>Esc {chinese ? '关闭' : 'Dismiss'}</span>
      </div>
    </div>
  </div>
{/if}
