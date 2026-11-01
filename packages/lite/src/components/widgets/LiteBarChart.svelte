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

<div class="lite-card lite-card-flush">
  {#if title}
    <div class="lite-card-header">
      <h2 class="lite-card-title">{title}</h2>
    </div>
  {/if}
  <div class="lite-card-body lite-stack-md">
    {#each data as point, _i (_i)}
      <div>
        <div class="lite-kv-row" style="margin-bottom: 4px; padding: 0;">
          <span style="color: #334155;">{point.label}</span>
          <span style="color: #425466; font-weight: 500;">{point.value}</span>
        </div>
        <div style="height: 20px; background: #f1f4f8; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: {(point.value / maxValue) * 100}%; background: {point.color ?? '#635bff'}; border-radius: 4px; transition: width 0.3s;"></div>
        </div>
      </div>
    {/each}
    {#if data.length === 0}
      <p style="color: #94a3b8; font-style: italic; text-align: center; margin: 0;">No data</p>
    {/if}
  </div>
</div>
