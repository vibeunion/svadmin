<script lang="ts">
  import { cn } from '../../utils.js';

  export interface StatusTabItem {
    key: string;
    label: string;
    count?: number | string;
    tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';
    disabled?: boolean;
  }

  interface Props {
    items: StatusTabItem[];
    value?: string;
    density?: 'compact' | 'comfortable';
    variant?: 'pills' | 'underline' | 'segmented';
    onchange?: (key: string) => void;
    class?: string;
  }

  let {
    items = [],
    value = $bindable(items[0]?.key ?? ''),
    density = 'compact',
    variant = 'pills',
    onchange,
    class: className = '',
  }: Props = $props();

  function selectTab(key: string, disabled?: boolean) {
    if (disabled || key === value) return;
    value = key;
    onchange?.(key);
  }

  const isCompact = $derived(density === 'compact');

  const toneClasses: Record<string, { activeBadge: string; inactiveBadge: string }> = {
    default: {
      activeBadge: 'bg-primary/20 text-primary',
      inactiveBadge: 'bg-muted text-muted-foreground',
    },
    success: {
      activeBadge: 'bg-success/25 text-success',
      inactiveBadge: 'bg-success/10 text-success',
    },
    warning: {
      activeBadge: 'bg-warning/25 text-warning-foreground',
      inactiveBadge: 'bg-warning/10 text-warning-foreground',
    },
    destructive: {
      activeBadge: 'bg-destructive/25 text-destructive',
      inactiveBadge: 'bg-destructive/10 text-destructive',
    },
    info: {
      activeBadge: 'bg-info/25 text-info',
      inactiveBadge: 'bg-info/10 text-info',
    },
    muted: {
      activeBadge: 'bg-muted text-foreground',
      inactiveBadge: 'bg-muted/50 text-muted-foreground',
    },
  };
</script>

<div
  role="tablist"
  data-svadmin-status-tabs
  data-density={density}
  data-variant={variant}
  class={cn(
    'flex items-center gap-1 overflow-x-auto',
    variant === 'segmented' && 'rounded-lg bg-muted p-1',
    variant === 'underline' && 'border-b border-border gap-2',
    className
  )}
>
  {#each items as item (item.key)}
    {@const active = value === item.key}
    {@const tone = item.tone ?? 'default'}
    {@const badgeTone = toneClasses[tone] ?? toneClasses.default}
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={item.disabled}
      onclick={() => selectTab(item.key, item.disabled)}
      class={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap font-medium transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
        isCompact ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5',
        variant === 'pills' && [
          'rounded-md border',
          active
            ? 'border-border bg-background text-foreground shadow-xs font-semibold'
            : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        ],
        variant === 'segmented' && [
          'rounded-md',
          active
            ? 'bg-background text-foreground shadow-xs font-semibold'
            : 'text-muted-foreground hover:text-foreground',
        ],
        variant === 'underline' && [
          '-mb-px border-b-2 rounded-none px-3 pb-2 pt-1',
          active
            ? 'border-primary text-primary font-semibold'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
        ]
      )}
    >
      <span>{item.label}</span>
      {#if item.count !== undefined}
        <span
          class={cn(
            'inline-flex items-center justify-center rounded-full font-semibold tabular-nums leading-none',
            isCompact ? 'min-w-4 px-1 py-0.5 text-[10px]' : 'min-w-5 px-1.5 py-0.5 text-xs',
            active ? badgeTone.activeBadge : badgeTone.inactiveBadge
          )}
        >
          {item.count}
        </span>
      {/if}
    </button>
  {/each}
</div>
