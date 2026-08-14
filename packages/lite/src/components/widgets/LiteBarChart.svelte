<script lang="ts">
  /**
   * SSR BarChart — Rendered as a pure CSS horizontal bar chart.
   * No charting library needed. Data is rendered server-side as
   * colored div bars with percentage widths.
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

  const maxValue = $derived(Math.max(...data.map(d => d.value), 1));
</script>

<div class="lite-card" style="margin-bottom: 16px;">
  {#if title}
    <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 14px; color: #0f172a;">
      {title}
    </div>
  {/if}
  <div class="lite-stack-md" style="padding: 16px;">
    {#each data as point, _i (_i)}
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px;">
          <span style="color: #334155;">{point.label}</span>
          <span style="color: #64748b; font-weight: 500;">{point.value}</span>
        </div>
        <div style="height: 20px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: {(point.value / maxValue) * 100}%; background: {point.color ?? '#6366f1'}; border-radius: 4px; transition: width 0.3s;"></div>
        </div>
      </div>
    {/each}
    {#if data.length === 0}
      <p style="color: #94a3b8; font-style: italic; text-align: center;">No data</p>
    {/if}
  </div>
</div>
