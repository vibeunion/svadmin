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

<div class="lite-card" style="margin-bottom: 16px;">
  {#if title}
    <div style="padding: 12px 16px; border-bottom: 1px solid #E5E6EB; font-weight: 600; font-size: 14px; color: #1D2129;">
      {title}
    </div>
  {/if}
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr>
        <th style="text-align: left; padding: 10px 16px; font-size: 12px; color: #4E5969; border-bottom: 1px solid #E5E6EB;">Label</th>
        <th style="text-align: right; padding: 10px 16px; font-size: 12px; color: #4E5969; border-bottom: 1px solid #E5E6EB;">{valueLabel}</th>
      </tr>
    </thead>
    <tbody>
      {#each data as point, i (i)}
        <tr style="background: {i % 2 === 0 ? '#ffffff' : '#F7F8FA'};">
          <td style="padding: 8px 16px; font-size: 13px; color: #1D2129;">{point.label}</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #1D2129; text-align: right; font-weight: 500;">{point.value}</td>
        </tr>
      {/each}
      {#if data.length === 0}
        <tr>
          <td colspan="2" style="padding: 16px; text-align: center; color: #86909C; font-style: italic;">No data</td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
