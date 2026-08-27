<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getResource, useNavigation, useCan, useTranslation } from '@svadmin/core';
  import { Button } from '../ui/button/index.js';
  import { Plus } from '@lucide/svelte';
  import type { ButtonAccessControl } from './access-control';

  const i18n = useTranslation();

  let {
    resource,
    label,
    children,
    hideText = false,
    accessControl = { enabled: true, hideIfUnauthorized: true },
    class: className = '',
  } = $props<{
    resource: string;
    label?: string;
    children?: Snippet;
    hideText?: boolean;
    accessControl?: ButtonAccessControl;
    class?: string;
  }>();

  const nav = useNavigation();
  const resourceDefinition = $derived.by(() => {
    try {
      return getResource(resource);
    } catch {
      return null;
    }
  });
  const can = useCan(() => ({
    resource,
    action: 'create',
    params: accessControl?.params,
    meta: accessControl?.meta,
    queryOptions: { enabled: accessControl?.enabled ?? true }
  }));
  const displayText = $derived(label ?? i18n.t('common.create'));
  const hidden = $derived(resourceDefinition?.canCreate === false || (accessControl?.hideIfUnauthorized && !can.allowed));
</script>

{#if !hidden}
  <Button
    variant="default"
    size={hideText ? 'icon' : 'default'}
    class={className}
    aria-label={hideText ? displayText : undefined}
    disabled={!can.allowed}
    onclick={() => nav.create(resource)}
  >
    <Plus class="h-4 w-4" />
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
{/if}
