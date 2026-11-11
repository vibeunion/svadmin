<script lang="ts">
  import LiteChartSvg from './LiteChartSvg.svelte';
  import LiteChartTable from './LiteChartTable.svelte';

  interface GaugeThreshold {
    value: number;
    label?: string;
  }

  interface Props {
    title?: string;
    label?: string;
    value?: number;
    min?: number;
    max?: number;
    unit?: string;
    target?: number;
    targetLabel?: string;
    thresholds?: GaugeThreshold[];
    data?: Array<Record<string, unknown>>;
    rows?: Array<Array<string | number>>;
    columns?: string[];
    emptyText?: string;
  }

  let {
    title,
    label,
    value,
    min = 0,
    max = 100,
    unit = '',
    target,
    targetLabel = 'Target',
    thresholds = [],
    data = [],
    rows,
    columns,
    emptyText,
  }: Props = $props();

  const heading = $derived(title ?? label ?? 'Gauge');

  const normalized = $derived.by(() => {
    if (rows) return rows;
    if (data.length > 0) {
      return data.map((item) => Object.values(item).map((entry) =>
        typeof entry === 'number' ? entry : String(entry ?? '')
      ));
    }
    if (typeof value !== 'number') return [];
    const metricRows: Array<Array<string | number>> = [
      ['Value', `${value}${unit}`],
      ['Range', `${min} – ${max}${unit}`],
    ];
    if (typeof target === 'number') metricRows.push([targetLabel, `${target}${unit}`]);
    for (const threshold of thresholds) {
      metricRows.push([threshold.label ?? 'Threshold', `${threshold.value}${unit}`]);
    }
    return metricRows;
  });
</script>

<div class="lite-chart-widget">
  <LiteChartSvg kind="gauge" rows={normalized} title={heading} />
  <LiteChartTable {title} kind="gauge" columns={columns ?? ['Label', 'Value']} rows={normalized} {emptyText} />
</div>
