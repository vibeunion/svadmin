<script lang="ts">
  import { onMount, onDestroy, type Snippet } from 'svelte';
  import {
    AlertTriangle,
    Info,
    AlertCircle,
    CheckCircle2,
    X,
    ChevronLeft,
    ChevronRight,
    Clock,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface AnnouncementItem {
    id: string | number;
    message: string;
    tone?: 'info' | 'warning' | 'error' | 'success' | undefined;
    actionText?: string | undefined;
    actionHref?: string | undefined;
    onaction?: (() => void) | undefined;
  }

  export interface AnnouncementBannerProps {
    /** 单条公告文案（与 items 互斥，简易单条模式） */
    message?: string | undefined;
    /** 多条公告列表，支持自动轮播与手动翻页 */
    items?: AnnouncementItem[] | undefined;
    /** 严重级别/色彩语义，默认 'warning' */
    tone?: 'info' | 'warning' | 'error' | 'success' | undefined;
    /** 屏幕阅读器播报策略；未指定时由 blocking 推导 */
    live?: 'off' | 'polite' | 'assertive' | undefined;
    /** 是否阻断当前任务；非阻断提示应设置为 false */
    blocking?: boolean | undefined;
    /** 维护/停服倒计时目标时间，自动计算并展示倒计时 */
    countdownTo?: Date | string | number | undefined;
    /** 倒计时前缀文案，默认 "距系统维护还剩: " */
    countdownPrefix?: string | undefined;
    /** 倒计时结束时回调 */
    oncountdownend?: (() => void) | undefined;
    /** 是否可手动关闭，默认 true */
    closable?: boolean | undefined;
    /** 点击关闭后保存至 localStorage 的 key，下次访问直接隐藏 */
    storageKey?: string | undefined;
    /** 多条公告轮播间隔（毫秒），默认 4000ms，为 0 时不自动轮播 */
    interval?: number | undefined;
    /** 快捷操作按钮文本 */
    actionText?: string | undefined;
    /** 快捷操作按钮跳转链接 */
    actionHref?: string | undefined;
    /** 快捷操作按钮点击回调 */
    onaction?: (() => void) | undefined;
    /** 关闭横幅回调 */
    onclose?: (() => void) | undefined;
    /** 自定义右侧操作区插槽 */
    actions?: Snippet | undefined;
    /** 尺寸规格：'sm' (紧凑) 或 'md' (标准) */
    size?: 'sm' | 'md' | undefined;
    class?: string | undefined;
  }

  let {
    message,
    items,
    tone = 'warning',
    live,
    blocking = true,
    countdownTo,
    countdownPrefix = '距系统维护还剩: ',
    oncountdownend,
    closable = true,
    storageKey,
    interval = 4000,
    actionText,
    actionHref,
    onaction,
    onclose,
    actions,
    size = 'md',
    class: className = '',
  }: AnnouncementBannerProps = $props();

  let visible = $state(true);
  let currentIndex = $state(0);
  let isPaused = $state(false);
  let countdownText = $state('');

  let carouselTimer: ReturnType<typeof setInterval> | null = null;
  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  const resolvedItems = $derived.by<AnnouncementItem[]>(() => {
    if (items && items.length > 0) return items;
    if (message) {
      return [{ id: 'single', message, tone, actionText, actionHref, onaction }];
    }
    return [];
  });

  const activeItem = $derived.by<AnnouncementItem | null>(() => {
    if (resolvedItems.length === 0) return null;
    return resolvedItems[currentIndex % resolvedItems.length] ?? null;
  });

  const currentTone = $derived.by<'info' | 'warning' | 'error' | 'success'>(() => {
    return activeItem?.tone ?? tone;
  });

  const liveMode = $derived(live ?? (blocking ? 'assertive' : 'polite'));

  const toneStyle = $derived.by(() => {
    switch (currentTone) {
      case 'info':
        return {
          container: 'bg-primary/10 border-primary/20 text-primary',
          icon: Info,
          btn: 'text-primary hover:bg-primary/10',
        };
      case 'error':
        return {
          container: 'bg-destructive/10 border-destructive/20 text-destructive',
          icon: AlertCircle,
          btn: 'text-destructive hover:bg-destructive/10',
        };
      case 'success':
        return {
          container: 'bg-success/10 border-success/20 text-success',
          icon: CheckCircle2,
          btn: 'text-success hover:bg-success/10',
        };
      case 'warning':
      default:
        return {
          container: 'bg-warning/10 border-warning/20 text-warning',
          icon: AlertTriangle,
          btn: 'text-warning hover:bg-warning/10',
        };
    }
  });

  function updateCountdown() {
    if (!countdownTo) {
      countdownText = '';
      return;
    }
    const target = new Date(countdownTo).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      countdownText = '00:00:00';
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      oncountdownend?.();
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (days > 0) {
      countdownText = `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    } else {
      countdownText = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
  }

  function handleClose() {
    visible = false;
    if (storageKey && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(storageKey, 'hidden');
      } catch {
        // Safe fallback in sandboxed frames
      }
    }
    onclose?.();
  }

  function handlePrev() {
    if (resolvedItems.length <= 1) return;
    currentIndex = (currentIndex - 1 + resolvedItems.length) % resolvedItems.length;
  }

  function handleNext() {
    if (resolvedItems.length <= 1) return;
    currentIndex = (currentIndex + 1) % resolvedItems.length;
  }

  onMount(() => {
    if (storageKey && typeof window !== 'undefined' && window.localStorage) {
      try {
        if (window.localStorage.getItem(storageKey) === 'hidden') {
          visible = false;
        }
      } catch {
        // Safe fallback
      }
    }

    if (countdownTo) {
      updateCountdown();
      countdownTimer = setInterval(updateCountdown, 1000);
    }

    if (interval > 0 && resolvedItems.length > 1) {
      carouselTimer = setInterval(() => {
        if (!isPaused) {
          currentIndex = (currentIndex + 1) % resolvedItems.length;
        }
      }, interval);
    }
  });

  onDestroy(() => {
    if (carouselTimer) clearInterval(carouselTimer);
    if (countdownTimer) clearInterval(countdownTimer);
  });
</script>

{#if visible && resolvedItems.length > 0 && activeItem}
  {@const Icon = toneStyle.icon}
  <div
    class={cn(
      'relative flex items-center justify-between border-b px-4 transition-all duration-200 select-none',
      size === 'sm' ? 'py-1.5 text-xs' : 'py-2.5 text-sm',
      toneStyle.container,
      className
    )}
    data-svadmin-component="AnnouncementBanner"
    data-svadmin-blocking={blocking}
    aria-live={liveMode}
    aria-atomic="true"
    role={liveMode === 'assertive' ? 'alert' : undefined}
    onmouseenter={() => (isPaused = true)}
    onmouseleave={() => (isPaused = false)}
  >
    <div class="flex items-center gap-2.5 min-w-0 flex-1">
      <span class="shrink-0 flex items-center">
        <Icon class={cn('shrink-0', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      </span>

      {#if resolvedItems.length > 1}
        <span class="shrink-0 font-mono text-xs opacity-75 font-medium">
          [{currentIndex + 1}/{resolvedItems.length}]
        </span>
      {/if}

      <div class="min-w-0 flex-1 truncate font-medium">
        <span>{activeItem.message}</span>
      </div>

      {#if countdownText}
        <div class="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-xs font-semibold bg-background/40 border border-current/20">
          <Clock class="h-3 w-3 shrink-0" />
          <span>{countdownPrefix}{countdownText}</span>
        </div>
      {/if}

      {#if activeItem.actionText}
        {#if activeItem.actionHref}
          <a
            href={activeItem.actionHref}
            class={cn('shrink-0 underline font-semibold transition-opacity hover:opacity-80 ml-2', size === 'sm' ? 'text-xs' : 'text-sm')}
            target="_blank"
            rel="noreferrer"
          >
            {activeItem.actionText}
          </a>
        {:else}
          <button
            type="button"
            class={cn('shrink-0 underline font-semibold transition-opacity hover:opacity-80 ml-2 cursor-pointer', size === 'sm' ? 'text-xs' : 'text-sm')}
            onclick={() => (activeItem?.onaction ? activeItem.onaction() : onaction?.())}
          >
            {activeItem.actionText}
          </button>
        {/if}
      {/if}
    </div>

    <div class="flex items-center gap-1 shrink-0 ml-3">
      {#if actions}
        {@render actions()}
      {/if}

      {#if resolvedItems.length > 1}
        <div class="flex items-center">
          <button
            type="button"
            class={cn('p-1 rounded transition-colors cursor-pointer', toneStyle.btn)}
            onclick={handlePrev}
            aria-label="Previous announcement"
          >
            <ChevronLeft class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class={cn('p-1 rounded transition-colors cursor-pointer', toneStyle.btn)}
            onclick={handleNext}
            aria-label="Next announcement"
          >
            <ChevronRight class="h-3.5 w-3.5" />
          </button>
        </div>
      {/if}

      {#if closable}
        <button
          type="button"
          class={cn('p-1 rounded transition-colors cursor-pointer ml-1', toneStyle.btn)}
          onclick={handleClose}
          aria-label="Close announcement"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      {/if}
    </div>
  </div>
{/if}
