<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    target?: Date | string | number;
    value?: Date | string | number;
    duration?: number;
    now?: number;
    start?: boolean;
    title?: string | Snippet;
    format?: string;
    onfinish?: () => void;
    class?: string;
  }

  let {
    target,
    value,
    duration,
    now: initialNow,
    start = true,
    title,
    format = 'full',
    onfinish,
    class: className = '',
  }: Props = $props();

  const effectiveTarget = $derived(value ?? target);
  let remaining = $state(0);
  let finished = $state(false);

  function resolveRemaining(): number {
    if (duration !== undefined) return Math.max(0, duration * 1000);
    if (!effectiveTarget) return 0;
    const end = effectiveTarget instanceof Date ? effectiveTarget.getTime() : new Date(effectiveTarget).getTime();
    const current = initialNow !== undefined ? initialNow : Date.now();
    return Number.isNaN(end) ? 0 : Math.max(0, end - current);
  }

  function formatTime(val: number): string {
    const total = Math.max(0, Math.floor(val / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const clock = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');

    if (format === 'clock') return clock;
    if (format === 'full') return days > 0 ? `${days}d ${clock}` : clock;

    let res = format;
    res = res.replace(/DD/g, String(days).padStart(2, '0'));
    res = res.replace(/\bD\b/g, String(days));
    res = res.replace(/HH/g, String(hours).padStart(2, '0'));
    res = res.replace(/\bH\b/g, String(hours));
    res = res.replace(/mm/g, String(minutes).padStart(2, '0'));
    res = res.replace(/\bm\b/g, String(minutes));
    res = res.replace(/ss/g, String(seconds).padStart(2, '0'));
    res = res.replace(/\bs\b/g, String(seconds));
    return res;
  }

  $effect(() => {
    const next = resolveRemaining();
    remaining = next;
    finished = next <= 0;
    if (next <= 0 || !start) return;
    const deadline = Date.now() + next;
    const timer = setInterval(() => {
      const currentVal = Math.max(0, deadline - Date.now());
      remaining = currentVal;
      if (currentVal === 0) {
        finished = true;
        clearInterval(timer);
        onfinish?.();
      }
    }, 250);
    return () => clearInterval(timer);
  });
</script>

<div class={cn('svadmin-countdown', className)} data-finished={finished ? 'true' : 'false'}>
  {#if title}
    <div class="svadmin-countdown__title">
      {#if typeof title === 'string'}{title}{:else}{@render title()}{/if}
    </div>
  {/if}
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
