<script lang="ts">
  interface Props {
    target?: Date | string | number;
    duration?: number;
    title?: string;
    format?: 'full' | 'clock';
    refreshHref?: string;
  }

  let { target, duration, title, format = 'full', refreshHref }: Props = $props();

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

  const remaining = $derived(resolveRemaining());
  const deadline = $derived(target ? (target instanceof Date ? target.toISOString() : new Date(target).toISOString()) : undefined);
</script>

<div class="lite-countdown" data-finished={remaining <= 0 || undefined}>
  {#if title}<p class="lite-countdown__title">{title}</p>{/if}
  <time class="lite-countdown__value" datetime={deadline}>{formatTime(remaining)}</time>
  {#if deadline}<small>Deadline: {deadline}</small>{/if}
  {#if refreshHref}<a href={refreshHref}>Refresh</a>{/if}
</div>

<style>
  .lite-countdown { display: block; }
  .lite-countdown__title { margin: 0; color: #86909C; font-size: 13px; }
  .lite-countdown__value { color: #1D2129; font-size: 24px; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.2; }
  .lite-countdown[data-finished] .lite-countdown__value { color: #86909C; }
  .lite-countdown small { color: #86909C; font-size: 12px; }
  .lite-countdown a { color: #165DFF; font-size: 12px; }

  .lite-countdown > * + * { margin-top: 4px; }
</style>
