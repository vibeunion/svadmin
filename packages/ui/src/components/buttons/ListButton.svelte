<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useNavigation, getResource, useTranslation } from '@svadmin/core';
  import { Button } from '../ui/button/index.js';
  import { List } from '@lucide/svelte';

  const i18n = useTranslation();

  let { resource: resourceName, hideText = false, label, children, onBeforeNavigate, class: className = '' } = $props<{
    resource: string;
    hideText?: boolean;
    label?: string;
    children?: Snippet;
    onBeforeNavigate?: (navigate: () => void) => void;
    class?: string;
  }>();

  const nav = useNavigation();
  const res = $derived((() => {
    try { return getResource(resourceName); } catch { return null; }
  })());
  const displayLabel = $derived(label ?? res?.label ?? i18n.t('common.list') ?? resourceName);

  function navigateToList() {
    const navigate = () => nav.list(resourceName);
    if (onBeforeNavigate) onBeforeNavigate(navigate);
    else navigate();
  }
</script>

<Button
  variant="outline"
  size={hideText ? 'icon' : 'sm'}
  class={className}
  aria-label={hideText ? displayLabel : undefined}
  onclick={navigateToList}
>
  <List class="h-4 w-4" />
  {#if !hideText}
    <span class="ml-1">
      {#if children}
        {@render children()}
      {:else}
        {displayLabel}
      {/if}
    </span>
  {/if}
</Button>
