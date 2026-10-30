<script lang="ts">
  import LiteChartSvg from './LiteChartSvg.svelte';
  import LiteChartTable from './LiteChartTable.svelte';

  interface Props {
    title?: string;
    data?: Array<Record<string, unknown>>;
    rows?: Array<Array<string | number>>;
    columns?: string[];
    emptyText?: string;
  }

  let { title, data = [], rows, columns, emptyText }: Props = $props();
  const normalized = $derived(rows ?? data.map((item) => Object.values(item).map((value) => typeof value === 'number' ? value : String(value ?? ''))));
</script>

<div class="lite-chart-widget">
  <LiteChartSvg kind="scatter" rows={normalized} {title} />
  <LiteChartTable {title} kind="scatter" columns={columns ?? ['Label', 'Value']} rows={normalized} {emptyText} />
</div>
