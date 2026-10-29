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
  const defaultColors = ['#165DFF', '#FF7D00', '#00B42A', '#F53F3F', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
</script>

<div class="lite-card" style="margin-bottom: 16px;">
  {#if title}
    <div style="padding: 12px 16px; border-bottom: 1px solid #E5E6EB; font-weight: 600; font-size: 14px; color: #1D2129;">
      {title}
    </div>
  {/if}
  <div class="lite-stack-md" style="padding: 16px;">
    {#each data as point, i (i)}
      {@const pct = total > 0 ? ((point.value / total) * 100).toFixed(1) : '0.0'}
      <div class="lite-inline-lg" style="align-items: center; font-size: 13px;">
        <span style="width: 12px; height: 12px; border-radius: 50%; background: {point.color ?? defaultColors[i % defaultColors.length]}; flex-shrink: 0;"></span>
        <span style="flex: 1; color: #1D2129;">{point.label}</span>
        <span style="color: #4E5969; font-weight: 500;">{point.value}</span>
        <span style="color: #86909C; font-size: 12px; min-width: 48px; text-align: right;">{pct}%</span>
      </div>
    {/each}
    {#if data.length === 0}
      <p style="color: #86909C; font-style: italic; text-align: center;">No data</p>
    {/if}
  </div>
</div>
