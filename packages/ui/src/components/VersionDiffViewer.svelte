<script lang="ts">
  import { untrack } from 'svelte';
  import { Badge } from './ui/badge/index.js';
  import { Button } from './ui/button/index.js';
  import { Columns2, AlignJustify } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    oldValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
    oldTitle?: string;
    newTitle?: string;
    viewMode?: 'split' | 'unified';
    fieldLabels?: Record<string, string>;
    class?: string;
  }

  let {
    oldValue = {},
    newValue = {},
    oldTitle = 'Previous Version',
    newTitle = 'Current Version',
    viewMode = 'split',
    fieldLabels = {},
    class: className = '',
  }: Props = $props();

  let mode = $state<'split' | 'unified'>(untrack(() => viewMode));

  interface FieldDiff {
    key: string;
    label: string;
    oldVal: unknown;
    newVal: unknown;
    status: 'added' | 'removed' | 'modified' | 'unchanged';
  }

  const diffList = $derived.by<FieldDiff[]>(() => {
    const oldObj = oldValue || {};
    const newObj = newValue || {};
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

    return allKeys.map((key) => {
      const hasOld = key in oldObj && oldObj[key] !== undefined;
      const hasNew = key in newObj && newObj[key] !== undefined;
      const oldVal = oldObj[key];
      const newVal = newObj[key];

      let status: FieldDiff['status'] = 'unchanged';
      if (!hasOld && hasNew) {
        status = 'added';
      } else if (hasOld && !hasNew) {
        status = 'removed';
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        status = 'modified';
      }

      return {
        key,
        label: fieldLabels[key] || key,
        oldVal,
        newVal,
        status,
      };
    });
  });

  const modifiedCount = $derived(diffList.filter((d) => d.status !== 'unchanged').length);

  function formatValue(val: unknown): string {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }
</script>

<div class={cn('rounded-xl border border-border bg-card shadow-xs overflow-hidden', className)}>
  <!-- Header & Toolbar -->
  <div class="flex items-center justify-between p-3.5 border-b border-border/60 bg-muted/20">
    <div class="flex items-center gap-2">
      <h4 class="text-xs font-semibold text-foreground">Record Comparison</h4>
      <Badge variant="outline" class="text-[11px]">
        {modifiedCount} change{modifiedCount === 1 ? '' : 's'}
      </Badge>
    </div>

    <div class="flex items-center gap-1">
      <Button
        variant={mode === 'split' ? 'secondary' : 'ghost'}
        size="sm"
        class="h-7 text-xs gap-1 px-2"
        onclick={() => { mode = 'split'; }}
      >
        <Columns2 class="h-3.5 w-3.5" />
        Side by Side
      </Button>
      <Button
        variant={mode === 'unified' ? 'secondary' : 'ghost'}
        size="sm"
        class="h-7 text-xs gap-1 px-2"
        onclick={() => { mode = 'unified'; }}
      >
        <AlignJustify class="h-3.5 w-3.5" />
        Unified
      </Button>
    </div>
  </div>

  {#if mode === 'split'}
    <!-- Split Side-by-Side View -->
    <div class="grid grid-cols-2 divide-x divide-border/60 text-xs">
      <div class="p-3 bg-muted/10 font-semibold text-muted-foreground border-b border-border/60">{oldTitle}</div>
      <div class="p-3 bg-muted/10 font-semibold text-muted-foreground border-b border-border/60">{newTitle}</div>
    </div>

    <div class="divide-y divide-border/40 text-xs">
      {#each diffList as diff (diff.key)}
        {@const isDiff = diff.status !== 'unchanged'}
        <div class={cn('grid grid-cols-2 divide-x divide-border/40 transition-colors', isDiff ? 'bg-muted/15' : '')}>
          <!-- Left Column -->
          <div class={cn('p-3 space-y-1', diff.status === 'removed' ? 'bg-destructive/5' : '')}>
            <div class="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span>{diff.label}</span>
              {#if diff.status === 'removed'}
                <Badge variant="outline" class="bg-destructive/15 text-destructive border-destructive/20 text-[10px]">Deleted</Badge>
              {/if}
            </div>
            <div class={cn('font-mono text-xs break-words', diff.status === 'removed' ? 'line-through text-destructive' : 'text-foreground')}>
              {formatValue(diff.oldVal)}
            </div>
          </div>

          <!-- Right Column -->
          <div class={cn('p-3 space-y-1', diff.status === 'added' ? 'bg-success/5' : diff.status === 'modified' ? 'bg-warning/5' : '')}>
            <div class="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span>{diff.label}</span>
              {#if diff.status === 'added'}
                <Badge variant="outline" class="bg-success/15 text-success border-success/20 text-[10px]">Added</Badge>
              {:else if diff.status === 'modified'}
                <Badge variant="outline" class="bg-warning/15 text-warning-foreground border-warning/20 text-[10px]">Modified</Badge>
              {/if}
            </div>
            <div class={cn('font-mono text-xs break-words', diff.status === 'added' ? 'text-success font-medium' : diff.status === 'modified' ? 'text-warning-foreground font-medium' : 'text-foreground')}>
              {formatValue(diff.newVal)}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Unified List View -->
    <div class="divide-y divide-border/40 text-xs">
      {#each diffList as diff (diff.key)}
        <div class="p-3 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-medium text-foreground">{diff.label}</span>
            {#if diff.status === 'added'}
              <Badge variant="outline" class="bg-success/15 text-success border-success/20 text-[10px]">Added</Badge>
            {:else if diff.status === 'removed'}
              <Badge variant="outline" class="bg-destructive/15 text-destructive border-destructive/20 text-[10px]">Removed</Badge>
            {:else if diff.status === 'modified'}
              <Badge variant="outline" class="bg-warning/15 text-warning-foreground border-warning/20 text-[10px]">Modified</Badge>
            {:else}
              <Badge variant="outline" class="text-[10px] text-muted-foreground">Unchanged</Badge>
            {/if}
          </div>

          {#if diff.status === 'modified'}
            <div class="space-y-1 rounded-md bg-muted/40 p-2 font-mono text-[11px]">
              <div class="text-destructive line-through">- {formatValue(diff.oldVal)}</div>
              <div class="text-success font-medium">+ {formatValue(diff.newVal)}</div>
            </div>
          {:else if diff.status === 'added'}
            <div class="rounded-md bg-success/10 p-2 font-mono text-[11px] text-success">
              + {formatValue(diff.newVal)}
            </div>
          {:else if diff.status === 'removed'}
            <div class="rounded-md bg-destructive/10 p-2 font-mono text-[11px] text-destructive line-through">
              - {formatValue(diff.oldVal)}
            </div>
          {:else}
            <div class="font-mono text-[11px] text-muted-foreground">
              {formatValue(diff.newVal)}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
