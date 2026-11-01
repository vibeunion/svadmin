<script lang="ts">
  let { route, params }: { route: string; params: Record<string, string | undefined> } = $props();
</script>

<section aria-label="Protected report">Protected report {route} {params['id'] ?? ''}</section>
