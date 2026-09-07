<script lang="ts">
  interface Props { value: string | null | undefined }
  let { value }: Props = $props();
</script>
{#if value}
  <a href="mailto:{value}" class="svadmin-u-20aaf08a7ed1 svadmin-u-f673f4a7d061 no-underline">{value}</a>
{:else}
  <span class="svadmin-u-bfa603190748">—</span>
{/if}
