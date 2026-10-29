<script lang="ts">
  interface Props { value: string | null | undefined }
  let { value }: Props = $props();
</script>
{#if value}
  <a href="mailto:{value}" class="text-primary hover:underline no-underline">{value}</a>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
