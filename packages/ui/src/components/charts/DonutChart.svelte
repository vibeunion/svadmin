<script lang="ts">
  import PieChart from './PieChart.svelte';

  interface Slice {
    label: string;
    value: number;
    color: string;
  }

  interface Props {
    data: Slice[];
    size?: number;
    /** Hole ratio; 0 renders a full pie. */
    donut?: number;
    class?: string;
  }

  let { data, size = 200, donut = 0.65, class: className = '' }: Props = $props();
</script>

<PieChart {data} {size} {donut} class={className} />
