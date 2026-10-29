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
    <div style="padding: 12px 16px; border-bottom: 1px solid #E5E6EB; font-weight: 600; font-size: 14px; color: #1D2129;">
      {title}
    </div>
  {/if}
  <div class="lite-stack-md" style="padding: 16px;">
    {#each data as point, _i (_i)}
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px;">
          <span style="color: #1D2129;">{point.label}</span>
          <span style="color: #4E5969; font-weight: 500;">{point.value}</span>
        </div>
        <div style="height: 20px; background: #F2F3F5; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: {(point.value / maxValue) * 100}%; background: {point.color ?? '#165DFF'}; border-radius: 4px; transition: width 0.3s;"></div>
        </div>
      </div>
    {/each}
    {#if data.length === 0}
      <p style="color: #86909C; font-style: italic; text-align: center;">No data</p>
    {/if}
  </div>
</div>
