<script lang="ts">
  import { useCan, type Action } from '@svadmin/core';
  import type { Snippet } from 'svelte';

  let {
    resource,
    action,
    children,
  }: {
    resource: string;
    action: Action;
    children: Snippet;
  } = $props();

  const permission = useCan(() => ({ resource, action }));
</script>

{#if !permission.isLoading && permission.allowed}
  {@render children()}
{/if}
