<script module lang="ts">
  import type { Status } from './StatusBadge.svelte';

  export interface AuditFieldChange {
    field: string;
    label?: string | undefined;
    oldValue?: unknown;
    newValue?: unknown;
  }

  export interface AuditActor {
    name?: string | undefined;
    avatar?: string | undefined;
    id?: string | undefined;
    ip?: string | undefined;
  }

  export interface TimelineItem {
    id: string;
    title: string;
    description?: string | undefined;
    timestamp?: string | number | undefined;
    actor?: AuditActor | string | undefined;
    action?: string | undefined;
    status?: Status | undefined;
    tag?: string | undefined;
    changes?: AuditFieldChange[] | undefined;
    meta?: Record<string, unknown> | undefined;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ArrowRight, Globe } from '@lucide/svelte';
  import { definedOptions } from '@svadmin/core/options';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../../utils.js';
  import StatusBadge from './StatusBadge.svelte';
  import DataState from './DataState.svelte';
  import type { BlockingDataStateKind } from './DataState.svelte';

  interface Props {
    items?: TimelineItem[];
    emptyTitle?: string | undefined;
    emptyDescription?: string | undefined;
    state?: BlockingDataStateKind | undefined;
    stateTitle?: string | undefined;
    stateDescription?: string | undefined;
    retry?: (() => void) | undefined;
    retryLabel?: string | undefined;
    loadingLabel?: string | undefined;
    action?: Snippet | undefined;
    class?: string | undefined;
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

  const actionToneMap: Record<string, Status> = {
    create: 'success',
    add: 'success',
    update: 'info',
    edit: 'info',
    delete: 'danger',
    remove: 'danger',
    approve: 'warning',
    reject: 'danger',
    rollback: 'warning',
  };

  const resolvedState = $derived(state ?? (items.length === 0 ? 'empty' : undefined));

  function formatTime(val: string | number | undefined): string {
    if (!val) return '';
    try {
      const d = typeof val === 'number' ? new Date(val) : new Date(val);
      return isNaN(d.getTime()) ? String(val) : d.toLocaleString();
    } catch {
      return String(val);
    }
  }

  function formatVal(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  function getActorName(actor: AuditActor | string | undefined): string | undefined {
    if (!actor) return undefined;
    if (typeof actor === 'string') return actor;
    return actor.name ?? actor.id;
  }

  function getActorIp(actor: AuditActor | string | undefined): string | undefined {
    if (!actor || typeof actor === 'string') return undefined;
    return actor.ip;
  }
</script>

<div class={cn('space-y-4', className)} data-svadmin-component="AuditTimeline" data-svadmin-audit-timeline data-svadmin-audit-state={resolvedState ?? 'ready'}>
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
        {@const statusTone = item.status ?? (item.action ? (actionToneMap[item.action.toLowerCase()] ?? 'info') : 'info')}
        {@const actorName = getActorName(item.actor)}
        {@const actorIp = getActorIp(item.actor)}
        <div class="relative flex flex-col gap-1 text-sm group" data-svadmin-audit-event={item.id}>
          <span
            class={cn(
              'absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-background transition-transform group-hover:scale-110',
              item.status || item.action ? dotClass[statusTone] : 'border-border bg-muted'
            )}
            aria-hidden="true"
          ></span>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="font-medium text-foreground">{item.title}</span>
              {#if actorName}
                <span class="text-xs text-muted-foreground">{i18n.t('audit.actorPrefix')}{actorName}</span>
              {/if}
              {#if actorIp}
                <span class="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground bg-muted/60 px-1 py-0.5 rounded">
                  <Globe class="h-3 w-3" />
                  {actorIp}
                </span>
              {/if}
              {#if item.tag}
                <StatusBadge status={statusTone} label={item.tag} />
              {/if}
            </div>

            {#if item.timestamp}
              <time class="text-xs tabular-nums text-muted-foreground font-mono">
                {formatTime(item.timestamp)}
              </time>
            {/if}
          </div>

          {#if item.description}
            <p class="text-xs text-muted-foreground">
              {item.description}
            </p>
          {/if}

          <!-- Field Changes Diff Section -->
          {#if item.changes && item.changes.length > 0}
            <div class="mt-2 rounded-md border border-border/60 bg-muted/40 p-2 space-y-1" data-svadmin-audit-diff>
              <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                变更对比 (Diff)
              </div>
              {#each item.changes as ch (ch.field)}
                <div class="flex items-center gap-2 text-xs py-0.5 border-b border-border/30 last:border-0">
                  <span class="font-medium text-foreground w-24 truncate flex-shrink-0" title={ch.label ?? ch.field}>
                    {ch.label ?? ch.field}:
                  </span>
                  <span class="line-through bg-destructive/10 text-destructive px-1.5 py-0.5 rounded text-[11px] font-mono truncate max-w-[120px]">
                    {formatVal(ch.oldValue)}
                  </span>
                  <ArrowRight class="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span class="bg-success/15 text-success font-medium px-1.5 py-0.5 rounded text-[11px] font-mono truncate max-w-[160px]">
                    {formatVal(ch.newValue)}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
