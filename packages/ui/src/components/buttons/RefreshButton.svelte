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
  <RefreshCw class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 {spinning ? 'svadmin-u-afbdd13a380e' : ''}" />
  {#if !hideText}
    <span class="svadmin-u-f58b02572ab2">
      {#if children}
        {@render children()}
      {:else}
        {displayText}
      {/if}
    </span>
  {/if}
</Button>
