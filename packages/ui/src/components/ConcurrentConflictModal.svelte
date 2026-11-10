<script lang="ts">
  import { ShieldAlert, X, AlertTriangle, ArrowRight, Check, RefreshCw, Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';

  export interface ConflictFieldDiff {
    field: string;
    label?: string | undefined;
    baseValue?: unknown;
    localValue?: unknown;
    remoteValue?: unknown;
  }

  export interface ConcurrentConflictModalProps {
    open?: boolean | undefined;
    title?: string | undefined;
    description?: string | undefined;
    conflictFields?: ConflictFieldDiff[] | undefined;
    modifiedBy?: string | undefined;
    modifiedAt?: string | number | undefined;
    loading?: boolean | undefined;
    class?: string | undefined;
    onoverwrite?: (() => void | Promise<void>) | undefined;
    ondiscard?: (() => void) | undefined;
    onresolve?: ((mergedData: Record<string, unknown>) => void | Promise<void>) | undefined;
    oncancel?: (() => void) | undefined;
  }

  let {
    open = $bindable(false),
    title,
    description,
    conflictFields = [],
    modifiedBy,
    modifiedAt,
    loading = false,
    class: className = '',
    onoverwrite,
    ondiscard,
    onresolve,
    oncancel,
  }: ConcurrentConflictModalProps = $props();

  const i18n = useTranslation();

  // 记录每个字段选择采纳本地还是远端
  let choices = $state<Record<string, 'local' | 'remote'>>({});
  let isSubmitting = $state(false);

  $effect(() => {
    if (open) {
      const initial: Record<string, 'local' | 'remote'> = {};
      for (const f of conflictFields) {
        initial[f.field] = 'local';
      }
      choices = initial;
    }
  });

  const resolvedTitle = $derived(title ?? i18n.t('conflict.title') ?? '并发修改冲突检测 (Concurrent Conflict)');
  const resolvedDesc = $derived(
    description ??
      (modifiedBy
        ? `该记录已被管理员 ${modifiedBy} 提交了新的变更。请审查冲突字段并选择合并策略。`
        : '该记录在远端已被他人更新，直接保存将造成覆盖。请审查差异并处理。')
  );

  function formatVal(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  function formatTime(t?: string | number): string {
    if (!t) return '';
    try {
      const d = typeof t === 'number' ? new Date(t) : new Date(t);
      return isNaN(d.getTime()) ? String(t) : d.toLocaleTimeString();
    } catch {
      return String(t);
    }
  }

  function handleSelectChoice(field: string, choice: 'local' | 'remote') {
    choices[field] = choice;
  }

  async function handleApplyMerge() {
    if (loading || isSubmitting) return;
    isSubmitting = true;
    try {
      const merged: Record<string, unknown> = {};
      for (const f of conflictFields) {
        const choice = choices[f.field] ?? 'local';
        merged[f.field] = choice === 'local' ? f.localValue : f.remoteValue;
      }
      await onresolve?.(merged);
      open = false;
    } finally {
      isSubmitting = false;
    }
  }

  async function handleForceOverwrite() {
    if (loading || isSubmitting) return;
    isSubmitting = true;
    try {
      await onoverwrite?.();
      open = false;
    } finally {
      isSubmitting = false;
    }
  }

  function handleDiscard() {
    if (loading || isSubmitting) return;
    open = false;
    ondiscard?.();
  }

  function handleClose() {
    if (loading || isSubmitting) return;
    open = false;
    oncancel?.();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
    data-svadmin-component="ConcurrentConflictModal"
    role="alertdialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="conflict-dialog-title"
    aria-describedby="conflict-dialog-desc"
  >
    <div
      class={cn(
        'relative w-full max-w-2xl rounded-xl border border-warning/30 bg-background shadow-2xl transition-all duration-200 overflow-hidden flex flex-col max-h-[90vh]',
        className
      )}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b px-5 py-4 bg-warning/10">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20 text-warning-foreground">
            <AlertTriangle class="h-5 w-5 text-warning" />
          </div>
          <div>
            <h3 id="conflict-dialog-title" class="text-base font-semibold text-foreground">
              {resolvedTitle}
            </h3>
            <p id="conflict-dialog-desc" class="text-xs text-muted-foreground mt-0.5">
              {resolvedDesc}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onclick={handleClose}
          aria-label="Close"
          disabled={loading || isSubmitting}
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Content Table -->
      <div class="p-5 overflow-y-auto space-y-4 flex-1">
        {#if modifiedBy || modifiedAt}
          <div class="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-md border border-border">
            <span>对方修改人：<strong class="text-foreground">{modifiedBy ?? '未知管理员'}</strong></span>
            {#if modifiedAt}
              <span>提交时间：<time class="font-mono">{formatTime(modifiedAt)}</time></span>
            {/if}
          </div>
        {/if}

        <div class="rounded-lg border border-border overflow-hidden">
          <table class="w-full text-xs text-left">
            <thead class="bg-muted text-muted-foreground font-medium border-b border-border">
              <tr>
                <th class="py-2.5 px-3">冲突字段</th>
                <th class="py-2.5 px-3">我的未保存修改 (Mine)</th>
                <th class="py-2.5 px-3">服务器最新数据 (Theirs)</th>
                <th class="py-2.5 px-3 text-right">采纳策略</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              {#each conflictFields as f}
                {@const currentChoice = choices[f.field] ?? 'local'}
                <tr class="hover:bg-muted/30 transition-colors">
                  <td class="py-2.5 px-3 font-semibold text-foreground">
                    {f.label ?? f.field}
                  </td>
                  <td class="py-2.5 px-3">
                    <span class={cn(
                      'inline-block px-1.5 py-0.5 rounded font-mono text-[11px]',
                      currentChoice === 'local' ? 'bg-primary/15 text-primary font-semibold ring-1 ring-primary/30' : 'bg-muted text-muted-foreground'
                    )}>
                      {formatVal(f.localValue)}
                    </span>
                  </td>
                  <td class="py-2.5 px-3">
                    <span class={cn(
                      'inline-block px-1.5 py-0.5 rounded font-mono text-[11px]',
                      currentChoice === 'remote' ? 'bg-success/15 text-success font-semibold ring-1 ring-success/30' : 'bg-muted text-muted-foreground'
                    )}>
                      {formatVal(f.remoteValue)}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-right">
                    <div class="inline-flex rounded-md border border-border p-0.5 bg-muted/50 gap-0.5">
                      <button
                        type="button"
                        class={cn(
                          'px-2 py-1 rounded text-[11px] font-medium transition-all',
                          currentChoice === 'local' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                        )}
                        onclick={() => handleSelectChoice(f.field, 'local')}
                        data-svadmin-choice={`local-${f.field}`}
                      >
                        使用我的
                      </button>
                      <button
                        type="button"
                        class={cn(
                          'px-2 py-1 rounded text-[11px] font-medium transition-all',
                          currentChoice === 'remote' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                        )}
                        onclick={() => handleSelectChoice(f.field, 'remote')}
                        data-svadmin-choice={`remote-${f.field}`}
                      >
                        使用远端
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3.5 bg-muted/20">
        <button
          type="button"
          class="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          onclick={handleDiscard}
          disabled={loading || isSubmitting}
          data-svadmin-action="discard-conflict"
        >
          放弃我的修改并刷新
        </button>

        <div class="flex items-center gap-2">
          {#if onoverwrite}
            <button
              type="button"
              class="rounded-md border border-destructive/40 text-destructive bg-destructive/10 px-3 py-1.5 text-xs font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
              onclick={handleForceOverwrite}
              disabled={loading || isSubmitting}
              data-svadmin-action="overwrite-conflict"
            >
              强制覆盖远端
            </button>
          {/if}

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
            onclick={handleApplyMerge}
            disabled={loading || isSubmitting}
            data-svadmin-action="merge-conflict"
          >
            {#if loading || isSubmitting}
              <Loader2 class="h-3.5 w-3.5 animate-spin" />
              <span>处理中...</span>
            {:else}
              <Check class="h-3.5 w-3.5" />
              <span>应用合并方案并保存</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
