<script lang="ts">
  import { Download } from '@lucide/svelte';
  interface Props { value: string | null | undefined; title?: string }
  let { value, title }: Props = $props();
  const fileName = $derived(value ? value.split('/').pop() ?? value : null);
</script>
{#if value}
  <a href={value} download class="text-primary hover:underline no-underline inline-flex items-center gap-1" title={title ?? fileName ?? ''}>
    <Download class="h-3.5 w-3.5 opacity-60" />
    {fileName}
  </a>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
