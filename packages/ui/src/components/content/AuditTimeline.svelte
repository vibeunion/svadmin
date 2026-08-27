<script module lang="ts">
  import type { Status } from './StatusBadge.svelte';

  export interface TimelineItem {
    id: string;
    title: string;
    description?: string;
    timestamp?: string;
    actor?: string;
    status?: Status;
    tag?: string;
    meta?: Record<string, unknown>;
  }
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import StatusBadge from './StatusBadge.svelte';
  import DataState from './DataState.svelte';

  interface Props {
    items?: TimelineItem[];
    emptyTitle?: string;
    emptyDescription?: string;
    class?: string;
  }

  let {
    items = [],
    emptyTitle = 'No timeline events',
    emptyDescription = 'Activity events and status transitions will appear here.',
    class: className = '',
  }: Props = $props();

  const dotClass: Record<Status, string> = {
    success: 'bg-success border-success/30 text-success',
    warning: 'bg-warning border-warning/30 text-warning-foreground',
    danger: 'bg-destructive border-destructive/30 text-destructive',
    info: 'bg-primary border-primary/30 text-primary',
    neutral: 'bg-muted-foreground border-border text-muted-foreground',
  };
</script>

<div class={cn('space-y-4', className)}>
  {#if items.length === 0}
    <DataState state="empty" title={emptyTitle} description={emptyDescription} />
  {:else}
    <div class="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
      {#each items as item (item.id)}
        {@const statusTone = item.status ?? 'info'}
        <div class="relative flex flex-col gap-1 text-sm group">
          <span
            class={cn(
              'absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-background transition-transform group-hover:scale-110',
              item.status ? dotClass[statusTone] : 'border-border bg-muted'
            )}
            aria-hidden="true"
          ></span>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="font-medium text-foreground">{item.title}</span>
              {#if item.actor}
                <span class="text-xs text-muted-foreground">by {item.actor}</span>
              {/if}
              {#if item.status}
                <StatusBadge status={item.status} label={item.tag ?? item.status} class="text-[11px] py-0 h-4" />
              {:else if item.tag}
                <span class="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted">
                  {item.tag}
                </span>
              {/if}
            </div>
            {#if item.timestamp}
              <time class="text-xs tabular-nums text-muted-foreground font-mono">{item.timestamp}</time>
            {/if}
          </div>

          {#if item.description}
            <p class="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
