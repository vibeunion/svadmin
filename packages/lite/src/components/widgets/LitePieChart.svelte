<script lang="ts">
  /**
   * SSR PieChart — Degraded to a list with colored dots.
   * Drawing SVG pie charts inline is technically possible but IE11
   * doesn't support CSS conic-gradient. We fall back to a plain list.
   */
  interface DataPoint {
    label: string;
    value: number;
    color?: string;
  }

  interface Props {
    data: DataPoint[];
    title?: string;
  }

  let { data, title }: Props = $props();

  const total = $derived(data.reduce((sum, d) => sum + d.value, 0));
  const defaultColors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
</script>

<div class="lite-card lite-card-flush">
  {#if title}
    <div class="lite-card-header">
      <h2 class="lite-card-title">{title}</h2>
    </div>
  {/if}
  <div class="lite-card-body lite-stack-md">
    {#each data as point, i (i)}
      {@const pct = total > 0 ? ((point.value / total) * 100).toFixed(1) : '0.0'}
      <div class="lite-inline-lg" style="align-items: center; font-size: 13px;">
        <span style="width: 12px; height: 12px; border-radius: 50%; background: {point.color ?? defaultColors[i % defaultColors.length]}; flex-shrink: 0;"></span>
        <span style="flex: 1; color: #334155;">{point.label}</span>
        <span style="color: #425466; font-weight: 500;">{point.value}</span>
        <span style="color: #94a3b8; font-size: 12px; min-width: 48px; text-align: right;">{pct}%</span>
      </div>
    {/each}
    {#if data.length === 0}
      <p style="color: #94a3b8; font-style: italic; text-align: center; margin: 0;">No data</p>
    {/if}
  </div>
</div>
