<script lang="ts">
  interface Props { value: string | null | undefined; maxLength?: number }
  let { value, maxLength }: Props = $props();
  const display = $derived(value && maxLength && value.length > maxLength ? value.slice(0, maxLength) + '…' : value);
  const needsTooltip = $derived(value && maxLength && value.length > maxLength);
</script>
{#if value}
  <span class="svadmin-u-bb0c4bfc52bd" title={needsTooltip ? value : undefined}>{display}</span>
{:else}
  <span class="svadmin-u-bfa603190748">—</span>
{/if}
