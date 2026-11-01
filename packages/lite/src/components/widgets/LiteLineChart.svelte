<script lang="ts">
  /**
   * SSR LineChart — renders an inline SVG polyline plus the same values as an
   * accessible data table. No charting library and no client JavaScript.
   */
  import LiteChartSvg from './LiteChartSvg.svelte';

  interface DataPoint {
    label: string;
    value: number;
  }

  interface Props {
    data: DataPoint[];
    title?: string;
    valueLabel?: string;
  }

  let { data, title, valueLabel = 'Value' }: Props = $props();
  const rows = $derived(data.map((point) => [point.label, point.value] as [string, number]));
</script>

<div class="lite-card lite-card-flush">
  {#if title}
    <div class="lite-card-header">
      <h2 class="lite-card-title">{title}</h2>
    </div>
  {/if}
  <LiteChartSvg kind="line" {rows} {title} />
  <div class="lite-table-scroll">
    <table class="lite-table">
      <thead>
        <tr>
          <th>Label</th>
          <th style="text-align: right;">{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {#each data as point, i (i)}
          <tr>
            <td>{point.label}</td>
            <td style="text-align: right; font-weight: 500;">{point.value}</td>
          </tr>
        {/each}
        {#if data.length === 0}
          <tr>
            <td colspan="2" style="text-align: center; color: #94a3b8; font-style: italic;">No data</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
