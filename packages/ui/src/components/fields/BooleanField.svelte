<script module lang="ts">
  export type BooleanTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
</script>

<script lang="ts">
  import { Badge } from '../ui/badge/index.js';
  import { cn } from '../../utils.js';

  interface Props {
    value: boolean | null | undefined;
    mode?: 'icon' | 'badge' | 'tag' | 'text';
    trueIcon?: string;
    falseIcon?: string;
    trueLabel?: string;
    falseLabel?: string;
    nullLabel?: string;
    trueTone?: BooleanTone;
    falseTone?: BooleanTone;
    class?: string;
  }

  let {
    value,
    mode = 'icon',
    trueIcon = '✓',
    falseIcon = '✗',
    trueLabel = 'Yes',
    falseLabel = 'No',
    nullLabel = '—',
    trueTone = 'success',
    falseTone = 'danger',
    class: className = '',
  }: Props = $props();

  const toneClass: Record<BooleanTone, string> = {
    success: 'border-success/30 bg-success/10 text-success',
    warning: 'border-warning/30 bg-warning/10 text-warning-foreground',
    danger: 'border-destructive/30 bg-destructive/10 text-destructive',
    info: 'border-primary/30 bg-primary/10 text-primary',
    neutral: 'border-border bg-muted text-muted-foreground',
  };
</script>

{#if value == null}
  <span class={cn('text-muted-foreground', className)}>{nullLabel}</span>
{:else if mode === 'badge' || mode === 'tag'}
  <Badge
    variant="outline"
    class={cn(
      'font-medium text-xs',
      value ? toneClass[trueTone] : toneClass[falseTone],
      className
    )}
  >
    {value ? trueLabel : falseLabel}
  </Badge>
{:else if mode === 'text'}
  <span
    class={cn(
      'font-medium text-sm',
      value
        ? trueTone === 'success'
          ? 'text-success'
          : 'text-foreground'
        : falseTone === 'danger'
          ? 'text-destructive'
          : 'text-muted-foreground',
      className
    )}
  >
    {value ? trueLabel : falseLabel}
  </span>
{:else}
  {#if value}
    <span
      class={cn(
        'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold',
        toneClass[trueTone],
        className
      )}
    >
      {trueIcon}
    </span>
  {:else}
    <span
      class={cn(
        'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold',
        toneClass[falseTone],
        className
      )}
    >
      {falseIcon}
    </span>
  {/if}
{/if}
