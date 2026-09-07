<script lang="ts">
  import { Download } from '@lucide/svelte';
  interface Props { value: string | null | undefined; title?: string }
  let { value, title }: Props = $props();
  const fileName = $derived(value ? value.split('/').pop() ?? value : null);
</script>
{#if value}
  <a href={value} download class="svadmin-u-20aaf08a7ed1 svadmin-u-f673f4a7d061 no-underline svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421" title={title ?? fileName ?? ''}>
    <Download class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-f2868c227fcd" />
    {fileName}
  </a>
{:else}
  <span class="svadmin-u-bfa603190748">—</span>
{/if}
