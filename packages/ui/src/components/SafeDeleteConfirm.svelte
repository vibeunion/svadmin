<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { ShieldAlert, X, AlertTriangle, AlertCircle, Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';

  export interface ImpactItem {
    label: string;
    count?: number | string | undefined;
    description?: string | undefined;
  }

  export interface SafeDeleteConfirmProps {
    open?: boolean | undefined;
    targetName: string;
    title?: string | undefined;
    description?: string | undefined;
    impactList?: ImpactItem[] | undefined;
    preventPaste?: boolean | undefined;
    countdown?: number | undefined;
    confirmText?: string | undefined;
    cancelText?: string | undefined;
    loading?: boolean | undefined;
    danger?: boolean | undefined;
    class?: string | undefined;
    onconfirm?: (() => void | Promise<void>) | undefined;
    oncancel?: (() => void) | undefined;
  }

  let {
    open = $bindable(false),
    targetName,
    title,
    description,
    impactList = [],
    preventPaste = true,
    countdown = 3,
    confirmText,
    cancelText,
    loading = false,
    danger = true,
    class: className = '',
    onconfirm,
    oncancel,
  }: SafeDeleteConfirmProps = $props();

  const i18n = useTranslation();

  function t(key: string, fallback: string): string {
    const val = i18n.t(key);
    return !val || val === key ? fallback : val;
  }

  let inputValue = $state('');
  let remainingSeconds = $state(3);
  let pasteBlocked = $state(false);
  let timer: ReturnType<typeof setInterval> | null = null;
  let isSubmitting = $state(false);

  const resolvedTitle = $derived(title ?? t('safeDelete.title', '确认高危删除操作'));
  const resolvedWarning = $derived(description ?? t('safeDelete.warning', '此操作无法撤销，可能会级联影响关联数据，请谨慎执行。'));
  const resolvedConfirmText = $derived(confirmText ?? t('safeDelete.confirm', '确认删除'));
  const resolvedCancelText = $derived(cancelText ?? t('common.cancel', '取消'));

  const isMatched = $derived(inputValue.trim() === targetName.trim());
  const isCooldown = $derived(remainingSeconds > 0);
  const isActionDisabled = $derived(!isMatched || isCooldown || loading || isSubmitting);

  function startCountdown() {
    clearTimer();
    remainingSeconds = Math.max(0, countdown);
    if (remainingSeconds <= 0) return;
    timer = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds -= 1;
      } else {
        clearTimer();
      }
    }, 1000);
  }

  function clearTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  $effect(() => {
    if (open) {
      untrack(() => {
        inputValue = '';
        pasteBlocked = false;
        startCountdown();
      });
    } else {
      untrack(() => {
        clearTimer();
      });
    }
  });

  onDestroy(() => {
    clearTimer();
  });

  function handlePaste(e: ClipboardEvent) {
    if (preventPaste) {
      e.preventDefault();
      pasteBlocked = true;
      setTimeout(() => {
        pasteBlocked = false;
      }, 3000);
    }
  }

  function handleClose() {
    if (loading || isSubmitting) return;
    open = false;
    oncancel?.();
  }

  async function handleConfirm() {
    if (isActionDisabled) return;
    try {
      isSubmitting = true;
      await onconfirm?.();
      open = false;
    } finally {
      isSubmitting = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && !isActionDisabled) {
      handleConfirm();
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
    onkeydown={handleKeydown}
    data-svadmin-component="SafeDeleteConfirm"
    role="alertdialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="safe-delete-title"
    aria-describedby="safe-delete-desc"
  >
    <div
      class={cn(
        'relative w-full max-w-lg rounded-xl border bg-background shadow-2xl transition-all duration-200 overflow-hidden',
        danger ? 'border-destructive/30' : 'border-border',
        className
      )}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b px-5 py-4 bg-muted/20">
        <div class="flex items-center gap-3">
          <div
            class={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              danger ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
            )}
          >
            {#if danger}
              <ShieldAlert class="h-5 w-5" />
            {:else}
              <AlertTriangle class="h-5 w-5" />
            {/if}
          </div>
          <div>
            <h3 id="safe-delete-title" class="text-base font-semibold text-foreground">
              {resolvedTitle}
            </h3>
            <p id="safe-delete-desc" class="text-xs text-muted-foreground mt-0.5">
              {resolvedWarning}
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

      <!-- Body Content -->
      <div class="p-5 space-y-4">
        <!-- Impact Assessment Section -->
        {#if impactList && impactList.length > 0}
          <div class="rounded-lg border border-border/80 bg-muted/30 p-3.5 space-y-2.5">
            <div class="flex items-center gap-2 text-xs font-medium text-foreground">
              <AlertCircle class="h-3.5 w-3.5 text-destructive" />
              <span>{t('safeDelete.impactTitle', '潜在影响面评估')}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {#each impactList as item (item.label)}
                <div class="flex items-center justify-between rounded-md bg-background px-3 py-2 text-xs border border-border/60">
                  <div class="truncate mr-2">
                    <span class="font-medium text-foreground">{item.label}</span>
                    {#if item.description}
                      <p class="text-[11px] text-muted-foreground truncate">{item.description}</p>
                    {/if}
                  </div>
                  {#if item.count !== undefined}
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-destructive/10 text-destructive">
                      {item.count}
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Target Confirmation Section -->
        <div class="space-y-2">
          <label for="safe-delete-input" class="block text-xs font-medium text-foreground">
            {t('safeDelete.inputPrompt', '请输入待删除资源名称以完成确认：')}
          </label>
          <div class="rounded-md bg-muted/60 p-2.5 border border-border flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Target:</span>
            <code class="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-background border border-border text-foreground select-all">
              {targetName}
            </code>
          </div>

          <div class="relative">
            <input
              id="safe-delete-input"
              type="text"
              class={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors',
                isMatched
                  ? 'border-primary focus:ring-primary/20'
                  : 'border-input focus:ring-primary/20'
              )}
              placeholder={targetName}
              bind:value={inputValue}
              onpaste={handlePaste}
              autocomplete="off"
              spellcheck="false"
              data-svadmin-field="confirm-input"
            />
          </div>

          {#if pasteBlocked}
            <p class="text-xs text-destructive flex items-center gap-1.5 transition-all">
              <AlertCircle class="h-3.5 w-3.5 flex-shrink-0" />
              <span>{t('safeDelete.pastePrevented', '为了确保安全性，禁止直接粘贴，请手动输入！')}</span>
            </p>
          {/if}
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-end gap-3 border-t px-5 py-3.5 bg-muted/10">
        <button
          type="button"
          class="rounded-md border border-input bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          onclick={handleClose}
          disabled={loading || isSubmitting}
        >
          {resolvedCancelText}
        </button>
        <button
          type="button"
          class={cn(
            'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium text-primary-foreground transition-all shadow-sm',
            danger
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-destructive/40'
              : 'bg-primary hover:bg-primary/90 disabled:bg-primary/40',
            isActionDisabled && 'cursor-not-allowed opacity-60'
          )}
          disabled={isActionDisabled}
          onclick={handleConfirm}
          data-svadmin-action="confirm-delete"
        >
          {#if loading || isSubmitting}
            <Loader2 class="h-3.5 w-3.5 animate-spin" />
            <span>{t('common.processing', '处理中...')}</span>
          {:else}
            <span>{resolvedConfirmText}</span>
            {#if isCooldown}
              <span class="opacity-80">({remainingSeconds}s)</span>
            {/if}
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
