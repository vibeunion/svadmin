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
  import type { Snippet } from 'svelte';
  import { definedOptions } from '@svadmin/core/options';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../../utils.js';
  import StatusBadge from './StatusBadge.svelte';
  import DataState from './DataState.svelte';
  import type { DataStateKind } from './DataState.svelte';

  interface Props {
    items?: TimelineItem[];
    emptyTitle?: string;
    emptyDescription?: string;
    state?: DataStateKind;
    stateTitle?: string;
    stateDescription?: string;
    retry?: () => void;
    retryLabel?: string;
    loadingLabel?: string;
    action?: Snippet;
    class?: string;
  }

  let {
    items = [],
    emptyTitle,
    emptyDescription,
    state,
    stateTitle,
    stateDescription,
    retry,
    retryLabel,
    loadingLabel,
    action,
    class: className = '',
  }: Props = $props();

  const i18n = useTranslation();
  const dotClass: Record<Status, string> = {
    success: 'bg-success border-success/30 text-success',
    warning: 'bg-warning border-warning/30 text-warning-foreground',
    danger: 'bg-destructive border-destructive/30 text-destructive',
    info: 'bg-primary border-primary/30 text-primary',
    neutral: 'bg-muted-foreground border-border text-muted-foreground',
  };
  const resolvedState = $derived(state ?? (items.length === 0 ? 'empty' : undefined));
</script>

<div class={cn('space-y-4', className)} data-svadmin-audit-timeline data-svadmin-audit-state={resolvedState ?? 'ready'}>
  {#if resolvedState}
    <DataState
      state={resolvedState}
      {...definedOptions({
        title: stateTitle ?? (resolvedState === 'empty' ? emptyTitle ?? i18n.t('audit.emptyTitle') : undefined),
        description: stateDescription ?? (resolvedState === 'empty' ? emptyDescription ?? i18n.t('audit.emptyDescription') : undefined),
        retry,
        retryLabel,
        loadingLabel,
        action,
      })}
    />
  {:else}
    <div class="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border" data-svadmin-audit-events>
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
                <span class="text-xs text-muted-foreground">{i18n.t('audit.actorPrefix')}{item.actor}</span>
              {/if}
              {#if item.status}
                <StatusBadge status={item.status} label={item.tag ?? i18n.t(`audit.status.${item.status}`)} class="text-[11px] py-0 h-4" />
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
