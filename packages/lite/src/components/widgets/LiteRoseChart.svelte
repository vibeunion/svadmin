<script lang="ts">
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

<LiteChartTable {title} kind="rose" columns={columns ?? ['Label', 'Value']} rows={normalized} {emptyText} />
