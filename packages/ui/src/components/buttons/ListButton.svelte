<script lang="ts">
  import { useNavigation, getResource, useTranslation } from '@svadmin/core';
  import { Button } from '../ui/button/index.js';
  import { List } from '@lucide/svelte';

  const i18n = useTranslation();

  let { resource: resourceName, hideText = false, label, class: className = '' } = $props<{
    resource: string;
    hideText?: boolean;
    label?: string;
    class?: string;
  }>();

  const nav = useNavigation();
  const res = $derived((() => {
    try { return getResource(resourceName); } catch { return null; }
  })());
  const displayLabel = $derived(label ?? res?.label ?? i18n.t('common.list') ?? resourceName);
</script>

<Button
  variant="outline"
  size={hideText ? 'icon' : 'sm'}
  class={className}
  onclick={() => nav.list(resourceName)}
>
  <List class="h-4 w-4" />
  {#if !hideText}<span class="ml-1">{displayLabel}</span>{/if}
</Button>
