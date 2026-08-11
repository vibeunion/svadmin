<script lang="ts">
  let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

{#if open}
  <span data-testid="layout-open-child"></span>
{/if}
