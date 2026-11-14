<script lang="ts">
  import { onMount, onDestroy, type Snippet } from 'svelte';
  import { Lock, Unlock, Eye, EyeOff, ShieldCheck, Clock } from '@lucide/svelte';
  import { formatAdminDate, useTranslation } from '@svadmin/core';
  import { cn } from '../utils.js';
  import MediaThumbnail from './content/MediaThumbnail.svelte';

  export interface LockScreenUser {
    name?: string;
    avatar?: string;
    role?: string;
  }

  interface Props {
    locked?: boolean;
    user?: LockScreenUser;
    idleTimeout?: number; // 分钟，默认 0 表示不启用自动超时锁屏
    showTrigger?: boolean;
    onUnlock?: (password: string) => Promise<boolean> | boolean;
    onLock?: () => void;
    class?: string;
    children?: Snippet;
  }

  let {
    locked = $bindable(false),
    user = { name: 'Admin', role: 'Administrator' },
    idleTimeout = 0,
    showTrigger = false,
    onUnlock,
    onLock,
    class: className = '',
    children,
  }: Props = $props();

  const i18n = useTranslation();

  let password = $state('');
  let showPassword = $state(false);
  let errorMsg = $state('');
  let verifying = $state(false);
  let isShaking = $state(false);
  const initial = $derived((user?.name?.trim()?.charAt(0) || 'A').toUpperCase());

  // 时钟状态
  let currentTime = $state('');
  let currentDate = $state('');
  let clockTimer: ReturnType<typeof setInterval> | null = null;

  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    currentTime = `${hours}:${minutes}:${seconds}`;

    currentDate = formatAdminDate(now, {
      locale: i18n.locale === 'zh-CN' ? 'zh-CN' : 'en-US',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }

  // 自动空闲超时检测
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  function resetIdleTimer() {
    if (idleTimeout <= 0 || locked) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      triggerLock();
    }, idleTimeout * 60 * 1000);
  }

  export function triggerLock() {
    locked = true;
    password = '';
    errorMsg = '';
    onLock?.();
  }

  async function handleUnlock() {
    if (!password.trim()) {
      errorMsg = i18n.t('common.enterPassword');
      triggerShake();
      return;
    }

    verifying = true;
    errorMsg = '';

    try {
      if (!onUnlock) {
        // 没有宿主鉴权回调时必须保持锁定，避免默认绕过会话保护。
        errorMsg = i18n.t('common.passwordError');
        triggerShake();
        return;
      }
      const success = await onUnlock(password);
      if (success) {
        locked = false;
        password = '';
      } else {
        errorMsg = i18n.t('common.passwordError');
        triggerShake();
      }
    } catch {
      errorMsg = i18n.t('common.passwordError');
      triggerShake();
    } finally {
      verifying = false;
    }
  }

  function triggerShake() {
    isShaking = true;
    setTimeout(() => {
      isShaking = false;
    }, 500);
  }

  function handleKeydown(event: KeyboardEvent) {
    // Alt + L 快捷锁屏
    if (event.altKey && (event.key === 'l' || event.key === 'L')) {
      event.preventDefault();
      triggerLock();
      return;
    }

    if (locked) {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleUnlock();
      }
    } else {
      resetIdleTimer();
    }
  }

  onMount(() => {
    updateClock();
    clockTimer = setInterval(updateClock, 1000);

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetIdleTimer();

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });
    window.addEventListener('keydown', handleKeydown);

    resetIdleTimer();

    return () => {
      if (clockTimer) clearInterval(clockTimer);
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  onDestroy(() => {
    if (clockTimer) clearInterval(clockTimer);
    if (idleTimer) clearTimeout(idleTimer);
  });
</script>

{#if showTrigger}
  <button
    type="button"
    class={cn(
      'inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
      className,
    )}
    title={i18n.t('common.lockScreen')}
    aria-label={i18n.t('common.lockScreen')}
    onclick={triggerLock}
  >
    <Lock size={18} />
  </button>
{/if}

{#if children}
  {@render children()}
{/if}

{#if locked}
  <div
    data-svadmin-component="lock-screen"
    class="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background/95 p-6 backdrop-blur-md select-none text-foreground transition-all duration-300"
    role="dialog"
    aria-modal="true"
    aria-label={i18n.t('common.lockScreen')}
  >
    <!-- 顶部状态栏 -->
    <div class="flex w-full items-center justify-between text-xs text-muted-foreground">
      <div class="flex items-center gap-1.5 font-medium">
        <ShieldCheck size={16} class="text-primary" />
        <span>SVAdmin Enterprise Session Guard</span>
      </div>
      <div class="flex items-center gap-1">
        <Clock size={14} />
        <span>{currentDate}</span>
      </div>
    </div>

    <!-- 中间核心时钟与解锁表单 -->
    <div class="flex flex-col items-center gap-6 max-w-sm w-full my-auto text-center">
      <!-- 动态时钟 -->
      <div class="space-y-1">
        <div class="text-6xl font-light tracking-tight font-mono text-foreground">{currentTime}</div>
        <div class="text-sm text-muted-foreground">{currentDate}</div>
      </div>

      <!-- 用户信息与头像 -->
      <div class="flex flex-col items-center gap-2">
        <div class="relative flex h-20 w-20 items-center justify-center rounded-full bg-muted border-2 border-primary/20 shadow-sm overflow-hidden">
          {#if user?.avatar}
            <MediaThumbnail
              src={user.avatar}
              alt={user.name || 'User'}
              size="full"
              fit="cover"
              showOverlay={false}
              class="h-full w-full rounded-full border-0"
            />
          {:else}
            <div class="text-2xl font-semibold text-primary">{initial}</div>
          {/if}
          <div class="absolute bottom-0 right-0 rounded-full bg-primary p-1 text-primary-foreground shadow-xs">
            <Lock size={12} />
          </div>
        </div>
        <div class="space-y-0.5">
          <div class="text-base font-semibold text-foreground">{user?.name || 'User'}</div>
          {#if user?.role}
            <div class="text-xs text-muted-foreground">{user.role}</div>
          {/if}
        </div>
      </div>

      <!-- 解锁表单 -->
      <div class={cn('w-full space-y-3', isShaking && 'animate-shake')}>
        <div class="relative flex items-center">
          <input
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder={i18n.t('common.enterPassword')}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            disabled={verifying}
          />
          <button
            type="button"
            class="absolute right-2.5 text-muted-foreground hover:text-foreground"
            onclick={() => (showPassword = !showPassword)}
            tabindex="-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {#if showPassword}
              <EyeOff size={16} />
            {:else}
              <Eye size={16} />
            {/if}
          </button>
        </div>

        {#if errorMsg}
          <div class="text-xs font-medium text-destructive">{errorMsg}</div>
        {/if}

        <button
          type="button"
          class="inline-flex w-full h-10 items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
          disabled={verifying}
          onclick={handleUnlock}
        >
          {#if verifying}
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></span>
          {:else}
            <Unlock size={16} />
          {/if}
          <span>{i18n.t('common.unlock')}</span>
        </button>
      </div>
    </div>

    <!-- 底部版权/提示 -->
    <div class="text-center text-xs text-muted-foreground">
      Press <kbd class="px-1.5 py-0.5 rounded bg-muted border text-[10px]">Enter</kbd> to unlock
    </div>
  </div>
{/if}
