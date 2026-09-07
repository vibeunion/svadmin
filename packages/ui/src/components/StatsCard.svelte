<script lang="ts">
  import { Skeleton } from './ui/skeleton/index.js';
  import type { Snippet } from 'svelte';

  type ColorVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';
  type StyleVariant = 'default' | 'outline' | 'filled';

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

<div class="svadmin-stats-card {className}" data-color={color} data-variant={variant}>
  {#if Icon}
    <div class="svadmin-stats-card__icon">
      <Icon class="svadmin-stats-card__icon-glyph" />
    </div>
  {/if}
  <div class="svadmin-stats-card__body">
    <p class="svadmin-stats-card__label">{label}</p>
    {#if loading}
      <Skeleton class="svadmin-stats-card__skeleton" />
    {:else}
      <div class="svadmin-stats-card__value-row">
        <p class="svadmin-stats-card__value">{value}</p>
        {#if trend}
          <span
            class="svadmin-stats-card__trend"
            data-positive={trend.value >= 0 ? 'true' : 'false'}
            aria-label="{trend.value >= 0 ? '上升' : '下降'} {Math.abs(trend.value)}%"
          >
            <span aria-hidden="true">{trend.value >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
            {#if trend.label}
              <span class="svadmin-stats-card__trend-label">{trend.label}</span>
            {/if}
          </span>
        {/if}
      </div>
    {/if}
    {#if footer}
      <div class="svadmin-stats-card__footer">
        {@render footer()}
      </div>
    {/if}
  </div>
</div>
