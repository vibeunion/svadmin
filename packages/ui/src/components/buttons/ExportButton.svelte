<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useCan, useTranslation, useExport, useResourceContract } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { Button } from '../ui/button/index.js';
  import { Download } from '@lucide/svelte';
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

  const binding = useResourceContract(() => resource);
  const exporter = useExport(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    get meta() { return binding.meta; },
  }));
  const can = useCan(() => ({
    resource,
    action: 'export',
    params: accessControl?.params,
    meta: accessControl?.meta,
    queryOptions: { enabled: accessControl?.enabled ?? true }
  }));
  const hidden = $derived(accessControl?.hideIfUnauthorized && !can.allowed);
  const displayText = $derived(label ?? i18n.t('common.export'));

  async function exportRecords() {
    if (!can.allowed || exporter.isLoading) return;
    try { await exporter.triggerExport(); }
    catch {
      // The hook exposes a sanitized error; stale-scope cancellations remain silent.
    }
  }
</script>

{#if !hidden}
  <Button
    variant="outline"
    size={hideText ? 'icon' : 'sm'}
    class={className}
    aria-label={hideText ? displayText : undefined}
    disabled={exporter.isLoading || !can.allowed}
    aria-busy={exporter.isLoading}
    onclick={exportRecords}
  >
    <Download class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
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
  {#if exporter.error}
    <p role="alert">{i18n.t('common.error')}</p>
  {/if}
{/if}
