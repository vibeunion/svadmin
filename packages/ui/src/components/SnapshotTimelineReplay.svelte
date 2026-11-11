<script lang="ts">
  import {
    History,
    Calendar,
    User,
    Hash,
    RotateCcw,
    ArrowRight,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface SnapshotRevision {
    id: string;
    version: string | number;
    timestamp: string;
    author: string;
    comment?: string | undefined;
    auditHash: string;
    snapshot: Record<string, unknown>;
  }

  export interface SnapshotTimelineReplayProps {
    revisions: SnapshotRevision[];
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onApplyRollback?: ((revision: SnapshotRevision) => void) | undefined;
  }

  let {
    revisions = [],
    title,
    description,
    class: className = '',
    onApplyRollback,
  }: SnapshotTimelineReplayProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let activeIndex = $state(0);

  const currentRevision = $derived(revisions[activeIndex] ?? null);
  const previousRevision = $derived(activeIndex > 0 ? revisions[activeIndex - 1] : null);

  const diffRows = $derived.by(() => {
    if (!currentRevision) return [];
    const prevData = previousRevision?.snapshot ?? {};
    const curData = currentRevision.snapshot ?? {};
    const allKeys = Array.from(new Set([...Object.keys(prevData), ...Object.keys(curData)]));

    return allKeys.map((key) => {
      const oldVal = prevData[key];
      const newVal = curData[key];
      const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);
      const isAdded = oldVal === undefined && newVal !== undefined;
      const isRemoved = oldVal !== undefined && newVal === undefined;

      return {
        key,
        oldVal: oldVal !== undefined ? String(oldVal) : '—',
        newVal: newVal !== undefined ? String(newVal) : '—',
        isChanged,
        isAdded,
        isRemoved,
      };
    });
  });

  const resolvedTitle = $derived(title ?? (chinese ? '时空快照审计回放与时间旅行对比器' : 'Snapshot Timeline & Time-Travel Replay'));
  const resolvedDesc = $derived(
    description ?? (chinese ? '任意历史版本时间戳快照回溯、字段级红绿对比与合规回滚申请' : 'Replay historical snapshots, inspect property diffs, and request rollback'),
  );
</script>

<div
  data-svadmin-component="SnapshotTimelineReplay"
  class={cn(
    'w-full rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-6 space-y-5',
    className,
  )}
>
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border/70 pb-4">
    <div class="flex items-center gap-2.5">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
        <History class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">{resolvedDesc}</p>
      </div>
    </div>
  </div>

  <!-- Time Travel Slider & Version Pills -->
  <div class="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/60">
    <div class="flex items-center justify-between text-xs">
      <span class="font-semibold text-foreground flex items-center gap-1.5">
        <Calendar class="h-3.5 w-3.5 text-primary" />
        {chinese ? '时间旅行轴 (拖动定位历史快照):' : 'Time Travel Timeline:'}
      </span>
      <span class="font-mono text-muted-foreground">
        {chinese ? `版本 ${activeIndex + 1} / 共 ${revisions.length} 版` : `Rev ${activeIndex + 1} of ${revisions.length}`}
      </span>
    </div>

    <!-- Range Slider for scrub timeline -->
    <input
      type="range"
      min="0"
      max={Math.max(0, revisions.length - 1)}
      step="1"
      bind:value={activeIndex}
      class="w-full h-2 cursor-pointer accent-primary"
      aria-label="Time travel revision slider"
    />

    <!-- Quick Version Buttons Strip -->
    <div class="flex gap-2 overflow-x-auto pt-1 pb-1">
      {#each revisions as rev, idx (rev.id)}
        <button
          type="button"
          onclick={() => (activeIndex = idx)}
          class={cn(
            'flex flex-col text-left px-3 py-1.5 rounded-lg border text-xs transition-all shrink-0',
            idx === activeIndex
              ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
              : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/40',
          )}
        >
          <span>v{rev.version}</span>
          <span class="text-[10px] opacity-75 font-mono">{rev.timestamp.slice(5, 16)}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Active Revision Metadata Strip -->
  {#if currentRevision}
    <div class="flex flex-wrap items-center justify-between gap-4 bg-card p-3 rounded-xl border border-border/80 text-xs">
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1 font-semibold text-foreground">
          <User class="h-3.5 w-3.5 text-primary" />
          <span>{currentRevision.author}</span>
        </span>
        {#if currentRevision.comment}
          <span class="text-muted-foreground">{currentRevision.comment}</span>
        {/if}
        <span class="flex items-center gap-1 font-mono text-muted-foreground text-[11px]">
          <Hash class="h-3 w-3" />
          <span>{currentRevision.auditHash}</span>
        </span>
      </div>

      {#if onApplyRollback}
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-7 text-xs gap-1.5"
          onclick={() => onApplyRollback(currentRevision)}
        >
          <RotateCcw class="h-3.5 w-3.5 text-primary" />
          <span>{chinese ? '申请回滚至此版本' : 'Rollback to this snapshot'}</span>
        </Button>
      {/if}
    </div>
  {/if}

  <!-- Snapshot Field Differences Table -->
  <div class="space-y-2">
    <div class="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
      <span>{chinese ? '字段级快照变更对照 (与上一版本比较)' : 'Field-level diff vs previous snapshot'}</span>
      <span>{diffRows.filter((r) => r.isChanged).length} 项属性变动</span>
    </div>

    <div class="rounded-xl border border-border overflow-hidden">
      <table class="w-full text-left text-xs border-collapse">
        <thead class="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
          <tr>
            <th class="p-3 w-48">{chinese ? '属性字段' : 'Property'}</th>
            <th class="p-3">{chinese ? '变更前 (Before)' : 'Before'}</th>
            <th class="p-3 w-8 text-center"></th>
            <th class="p-3">{chinese ? '变更后 (After)' : 'After'}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          {#each diffRows as row (row.key)}
            <tr class={cn(row.isChanged && 'bg-warning/5')}>
              <td class="p-3 font-mono font-medium text-foreground">{row.key}</td>
              <td class="p-3 text-muted-foreground font-mono">
                {#if row.isChanged}
                  <span class="line-through text-destructive/80">{row.oldVal}</span>
                {:else}
                  <span>{row.oldVal}</span>
                {/if}
              </td>
              <td class="p-3 text-center text-muted-foreground">
                {#if row.isChanged}
                  <ArrowRight class="h-3.5 w-3.5 text-warning mx-auto" />
                {/if}
              </td>
              <td class="p-3 font-mono">
                {#if row.isChanged}
                  <span class="font-bold text-success">{row.newVal}</span>
                {:else}
                  <span class="text-muted-foreground">{row.newVal}</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
