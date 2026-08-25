<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CircleAlert, Info, TriangleAlert } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  export type FeedbackNoticeTone = 'info' | 'warning' | 'danger';
  export type FeedbackNoticePriority = 'contextual' | 'blocking';

  interface Props {
    message: string;
    tone?: FeedbackNoticeTone;
    priority?: FeedbackNoticePriority;
    action?: Snippet;
    class?: string;
  }

  let {
    message,
    tone = 'info',
    priority = 'contextual',
    action,
    class: className = '',
  }: Props = $props();

  const isBlocking = $derived(priority === 'blocking' || tone === 'danger');
  const toneClass = $derived(
    tone === 'danger'
      ? 'border-destructive/40 bg-destructive/5 text-destructive'
      : tone === 'warning'
        ? 'border-warning/50 bg-warning/10 text-warning-foreground'
        : 'border-border bg-muted/40 text-foreground',
  );
</script>

<div
  data-svadmin-feedback-notice
  data-tone={tone}
  data-priority={priority}
  role={isBlocking ? 'alert' : 'status'}
  aria-live={isBlocking ? 'assertive' : 'polite'}
  class={cn(
    'flex w-full flex-col gap-3 rounded-md border px-3 py-2.5 text-sm sm:flex-row sm:items-center',
    isBlocking && 'border-l-2',
    toneClass,
    className,
  )}
>
  <div class="flex min-w-0 flex-1 items-start gap-2.5">
    {#if tone === 'danger'}
      <CircleAlert class="mt-0.5 size-4 shrink-0" />
    {:else if tone === 'warning'}
      <TriangleAlert class="mt-0.5 size-4 shrink-0" />
    {:else}
      <Info class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
    {/if}
    <p class="min-w-0 leading-5">{message}</p>
  </div>
  {#if action}
    <div class="shrink-0">{@render action()}</div>
  {/if}
</div>
