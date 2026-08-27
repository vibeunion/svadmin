<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useNavigation, useCan, useTranslation } from '@svadmin/core';
  import { Button } from '../ui/button/index.js';
  import { Eye } from '@lucide/svelte';
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
    onBeforeNavigate,
    class: className = '',
  } = $props<{
    resource: string;
    recordItemId: string | number;
    label?: string;
    children?: Snippet;
    hideText?: boolean;
    accessControl?: ButtonAccessControl;
    onBeforeNavigate?: (navigate: () => void) => void;
    class?: string;
  }>();

  const nav = useNavigation();
  const can = useCan(() => ({
    resource,
    action: 'show',
    params: withRecordId(accessControl?.params, recordItemId),
    meta: accessControl?.meta,
    queryOptions: { enabled: accessControl?.enabled ?? true }
  }));
  const hidden = $derived(accessControl?.hideIfUnauthorized && !can.allowed);
  const displayText = $derived(label ?? i18n.t('common.detail'));

  function navigateToRecord() {
    const navigate = () => nav.show(resource, recordItemId);
    if (onBeforeNavigate) onBeforeNavigate(navigate);
    else navigate();
  }
</script>

{#if !hidden}
  <Button
    variant="ghost"
    size={hideText ? 'icon' : 'sm'}
    class={className}
    aria-label={hideText ? displayText : undefined}
    disabled={!can.allowed}
    onclick={navigateToRecord}
  >
    <Eye class="h-4 w-4" />
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
