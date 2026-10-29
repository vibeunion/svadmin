<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    target?: Date | string | number;
    duration?: number;
    title?: string;
    format?: 'full' | 'clock';
    onfinish?: () => void;
    class?: string;
  }

  let { target, duration, title, format = 'full', onfinish, class: className = '' }: Props = $props();
  let remaining = $state(0);
  let finished = $state(false);

  function resolveRemaining(): number {
    if (duration !== undefined) return Math.max(0, duration * 1000);
    if (!target) return 0;
    const end = target instanceof Date ? target.getTime() : new Date(target).getTime();
    return Number.isNaN(end) ? 0 : Math.max(0, end - Date.now());
  }

  function formatTime(value: number): string {
    const total = Math.max(0, Math.floor(value / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const clock = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
    return format === 'clock' ? clock : days > 0 ? `${days}d ${clock}` : clock;
  }

  onMount(() => {
    remaining = resolveRemaining();
    finished = remaining <= 0;
    if (finished) return;
    const timer = setInterval(() => {
      remaining = Math.max(0, remaining - 1000);
      if (remaining === 0 && !finished) {
        finished = true;
        clearInterval(timer);
        onfinish?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  });
</script>

<div class={cn('svadmin-countdown', className)} data-finished={finished ? 'true' : 'false'}>
  {#if title}<p class="svadmin-countdown__title">{title}</p>{/if}
  <time class="svadmin-countdown__value" aria-live="off">{formatTime(remaining)}</time>
  <span class="svadmin-countdown__sr" aria-live="polite">{finished ? 'Countdown finished' : formatTime(remaining)}</span>
</div>

<style>
  .svadmin-countdown { display: grid; gap: var(--svadmin-space-1); }
  .svadmin-countdown__title { margin: 0; color: var(--muted-foreground); font-size: var(--svadmin-text-label); }
  .svadmin-countdown__value { color: var(--foreground); font-size: var(--svadmin-text-heading); font-weight: 650; font-variant-numeric: tabular-nums; line-height: var(--svadmin-leading-tight); }
  .svadmin-countdown[data-finished='true'] .svadmin-countdown__value { color: var(--muted-foreground); }
  .svadmin-countdown__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>