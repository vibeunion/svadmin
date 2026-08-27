<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useInvalidate, useTranslation } from '@svadmin/core';
  import { Button } from '../ui/button/index.js';
  import { RefreshCw } from '@lucide/svelte';

  const i18n = useTranslation();

  let {
    resource,
    label,
    children,
    hideText = false,
    class: className = '',
  } = $props<{
    resource: string;
    label?: string;
    children?: Snippet;
    hideText?: boolean;
    class?: string;
  }>();

  const invalidate = useInvalidate();
  let spinning = $state(false);
  let spinTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    return () => { if (spinTimer) clearTimeout(spinTimer); };
  });

  function refresh() {
    spinning = true;
    invalidate({ resource, invalidates: ['list', 'many'] });
    if (spinTimer) clearTimeout(spinTimer);
    spinTimer = setTimeout(() => { spinning = false; }, 600);
  }

  const displayText = $derived(label ?? i18n.t('common.refresh'));
</script>

<Button
  variant="ghost"
  size={hideText ? 'icon' : 'sm'}
  class={className}
  aria-label={hideText ? displayText : undefined}
  onclick={refresh}
>
  <RefreshCw class="h-4 w-4 {spinning ? 'animate-spin' : ''}" />
  {#if !hideText}
    <span class="ml-1">
      {#if children}
        {@render children()}
      {:else}
        {displayText}
      {/if}
    </span>
  {/if}
</Button>
