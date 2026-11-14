<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ShieldAlert, Clock, Lock, RefreshCw } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { useSessionTimeout } from './useSessionTimeout.svelte.js';

  export interface SessionTimeoutGuardProps {
    /** Inactivity threshold in minutes (default: 15) */
    timeoutMinutes?: number | undefined;
    /** Warning countdown window in seconds (default: 60) */
    warningSeconds?: number | undefined;
    /** Whether monitoring is actively enabled (default: true) */
    enabled?: boolean | undefined;
    title?: string | undefined;
    description?: string | undefined;
    extendText?: string | undefined;
    lockText?: string | undefined;
    onTimeout?: (() => void) | undefined;
    onExtend?: (() => void) | undefined;
    class?: string | undefined;
    children?: Snippet | undefined;
    modal?: Snippet<[{ remainingSeconds: number; extend: () => void; lockNow: () => void }]> | undefined;
  }

  let {
    timeoutMinutes = 15,
    warningSeconds = 60,
    enabled = true,
    title,
    description,
    extendText,
    lockText,
    onTimeout,
    onExtend,
    class: className = '',
    children,
    modal,
  }: SessionTimeoutGuardProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  const guard = useSessionTimeout({
    timeoutMinutes: () => timeoutMinutes,
    warningSeconds: () => warningSeconds,
    enabled: () => enabled,
    onTimeout: () => {
      onTimeout?.();
    },
    onExtend: () => {
      onExtend?.();
    },
  });

  const resolvedTitle = $derived(
    title ?? (chinese ? '会话空闲超时预警' : 'Session Inactivity Warning'),
  );

  const resolvedDesc = $derived(
    description ??
      (chinese
        ? '为了账户与数据安全，检测到长时间没有操作。倒计时结束后将锁定会话。'
        : 'For your security, your session will automatically lock due to inactivity.'),
  );

  const resolvedExtendText = $derived(extendText ?? (chinese ? '延长会话' : 'Keep Working'));
  const resolvedLockText = $derived(lockText ?? (chinese ? '立即锁定' : 'Lock Now'));
</script>

<div
  data-svadmin-component="SessionTimeoutGuard"
  data-warning={guard.isWarning ? 'true' : 'false'}
  data-timed-out={guard.isTimedOut ? 'true' : 'false'}
  class={cn('relative w-full', className)}
>
  {#if children}
    {@render children()}
  {/if}

  <!-- Countdown Warning Dialog -->
  {#if guard.isWarning && !guard.isTimedOut}
    {#if modal}
      {@render modal({
        remainingSeconds: guard.remainingSeconds,
        extend: guard.extend,
        lockNow: guard.lockNow,
      })}
    {:else}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-warning-title"
        aria-describedby="session-warning-desc"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4 bg-background/80 backdrop-blur-sm"
      >
        <div
          class="relative z-50 w-full max-w-md rounded-md border border-border bg-card p-6 text-card-foreground shadow-[var(--shadow-overlay)] animate-in fade-in zoom-in-95 duration-150"
        >
          <div class="flex items-start gap-4">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-warning/15 text-warning border border-warning/20">
              <ShieldAlert class="h-6 w-6" />
            </div>

            <div class="flex-1 space-y-1.5 min-w-0">
              <div class="flex items-center gap-2">
                <h3 id="session-warning-title" class="text-base font-semibold text-foreground">
                  {resolvedTitle}
                </h3>
              </div>
              <p id="session-warning-desc" class="text-xs text-muted-foreground leading-relaxed">
                {resolvedDesc}
              </p>

              <!-- Real-time Countdown Pill -->
              <div class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning border border-warning/20">
                <Clock class="h-3.5 w-3.5" />
                <span>
                  {chinese
                    ? `${guard.remainingSeconds} 秒后自动锁定`
                    : `Auto-locking in ${guard.remainingSeconds}s`}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onclick={guard.lockNow}
              class="gap-1.5"
            >
              <Lock class="h-3.5 w-3.5 text-muted-foreground" />
              <span>{resolvedLockText}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onclick={guard.extend}
              class="gap-1.5 min-w-24 font-medium"
            >
              <RefreshCw class="h-3.5 w-3.5" />
              <span>{resolvedExtendText}</span>
            </Button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
