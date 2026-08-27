<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useNavigation, useCan, useTranslation } from '@svadmin/core';
  import { Button } from '../ui/button/index.js';
  import { Copy } from '@lucide/svelte';
  import type { ButtonAccessControl } from './access-control';
  import { withRecordId } from './access-control';

  const i18n = useTranslation();

  let {
    resource,
    recordItemId,
    label,
    children,
    hideText = false,
    accessControl = { enabled: true, hideIfUnauthorized: true },
    class: className = '',
  } = $props<{
    resource: string;
    recordItemId: string | number;
    label?: string;
    children?: Snippet;
    hideText?: boolean;
    accessControl?: ButtonAccessControl;
    class?: string;
  }>();

  const nav = useNavigation();
  const can = useCan(() => ({
    resource,
    action: 'create',
    params: withRecordId(accessControl?.params, recordItemId),
    meta: accessControl?.meta,
    queryOptions: { enabled: accessControl?.enabled ?? true }
  }));
  const hidden = $derived(accessControl?.hideIfUnauthorized && !can.allowed);
  const displayText = $derived(label ?? i18n.t('common.clone'));
</script>

{#if !hidden}
  <Button
    variant="outline"
    size={hideText ? 'icon' : 'sm'}
    class={className}
    disabled={!can.allowed}
    onclick={() => nav.clone(resource, recordItemId)}
  >
    <Copy class="h-4 w-4" />
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
