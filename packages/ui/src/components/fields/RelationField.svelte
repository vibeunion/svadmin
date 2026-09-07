<script lang="ts">
  import { ExternalLink } from '@lucide/svelte';
  import { captureAdminContext } from '@svadmin/core';

  let { value, resourceName, displayValue } = $props<{
    value: string | number | null | undefined;
    resourceName?: string;
    displayValue?: string;
  }>();
  const adminContext = captureAdminContext();

  const display = $derived(displayValue ?? (value != null ? `#${value}` : '—'));
  const href = $derived.by(() => {
    if (!resourceName || value == null) return undefined;
    const path = `/${resourceName}/show/${value}`;
    return adminContext.formatLink(path);
  });
</script>

{#if href}
  <a
    {href}
    class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-20aaf08a7ed1 svadmin-u-f673f4a7d061 svadmin-u-fc7473ca09eb"
  >
    {display}
    <ExternalLink class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
  </a>
{:else}
  <span class="svadmin-u-bfa603190748">{display}</span>
{/if}
