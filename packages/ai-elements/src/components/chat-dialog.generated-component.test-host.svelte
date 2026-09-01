<script lang="ts">
  let {
    warehouse,
    count,
  }: {
    warehouse: string;
    count: number;
  } = $props();
</script>

<p data-testid="generated-inventory">{warehouse}: {count}</p>
