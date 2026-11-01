<script lang="ts">
  /**
   * SSR LineChart — Degraded to an HTML data table.
   * Drawing SVG/Canvas line charts inline is possible but complex.
   * For maximum compatibility (IE11), we render data as a simple table.
   */
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
</script>

<div class="lite-card lite-card-flush">
  {#if title}
    <div class="lite-card-header">
      <h2 class="lite-card-title">{title}</h2>
    </div>
  {/if}
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
