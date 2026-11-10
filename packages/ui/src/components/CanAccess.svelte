<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useCan } from '@svadmin/core';
  import type { Action } from '@svadmin/core';

  let { resource, action, params, meta, children, fallback }: {
    resource: string;
    action: Action;
    params?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    children: Snippet;
    fallback?: Snippet;
  } = $props();

  const can = useCan(() => ({ resource, action, params, meta }));
</script>

{#if can.isLoading}
  <!-- Loading: nothing rendered -->
{:else if can.allowed}
  {@render children()}
{:else if fallback}
  {@render fallback()}
{/if}
