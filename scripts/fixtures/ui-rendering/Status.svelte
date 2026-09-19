<script lang="ts">
  let { status }: { status: 'paid' | 'pending' } = $props();
</script>
<span data-testid="component-status">{status}</span>
