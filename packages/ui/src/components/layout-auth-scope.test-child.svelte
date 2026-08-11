<script lang="ts">
  import type { Identity } from '@svadmin/core';

  let { identity }: { identity?: Identity | null } = $props();
</script>

{#if identity}
  <span>{identity.name}</span>
{/if}
