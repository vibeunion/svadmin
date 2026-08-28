<script lang="ts">
  import { Skeleton } from './ui/skeleton/index.js';
  import type { Snippet } from 'svelte';

  type ColorVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';
  type StyleVariant = 'default' | 'outline' | 'filled';

  const colorMap: Record<ColorVariant, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
    info: 'bg-info/10 text-info',
  };

  const variantMap: Record<StyleVariant, string> = {
    default: 'bg-card shadow-sm hover:shadow-md transition-shadow duration-300',
    outline: 'border-2 border-border bg-transparent',
    filled: 'border-0 bg-muted/50 shadow-sm',
  };

  interface Props {
    label: string;
    value: string | number;
    icon?: import('svelte').Component<{ class?: string }>;
    trend?: { value: number; label?: string };
    loading?: boolean;
    color?: ColorVariant;
    variant?: StyleVariant;
    /** Optional footer snippet for additional content below the value */
    footer?: Snippet;
    class?: string;
  }

  let {
    label,
    value,
    icon: Icon,
    trend,
    loading = false,
    color = 'primary',
    variant = 'default',
    footer,
    class: className = '',
  }: Props = $props();
</script>

<div class="flex items-center gap-4 rounded-lg p-5 {variantMap[variant]} {className}">
  {#if Icon}
    <div class="flex h-12 w-12 items-center justify-center rounded-lg {colorMap[color]}">
      <Icon class="h-6 w-6" />
    </div>
  {/if}
  <div class="flex-1 min-w-0">
    <p class="text-sm text-muted-foreground">{label}</p>
    {#if loading}
      <Skeleton class="mt-1 h-7 w-20" />
    {:else}
      <div class="flex items-baseline gap-2">
        <p class="text-xl font-mono font-semibold text-foreground tracking-tight">{value}</p>
        {#if trend}
          <span
            class="text-xs font-medium inline-flex items-center gap-0.5 {trend.value >= 0 ? 'text-success' : 'text-destructive'}"
            aria-label="{trend.value >= 0 ? '上升' : '下降'} {Math.abs(trend.value)}%"
          >
            <span aria-hidden="true">{trend.value >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
            {#if trend.label}
              <span class="text-muted-foreground ml-0.5">{trend.label}</span>
            {/if}
          </span>
        {/if}
      </div>
    {/if}
    {#if footer}
      <div class="mt-2">
        {@render footer()}
      </div>
    {/if}
  </div>
</div>
