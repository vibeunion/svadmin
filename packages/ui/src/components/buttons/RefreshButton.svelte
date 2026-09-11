<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useTranslation, useInvalidate, useResourceContract, captureAdminContext } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
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

  const binding = useResourceContract(() => resource);
  const context = captureAdminContext();
  const invalidate = useInvalidate(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
  }));
  const scope = $derived({
    contract: binding.resource,
    provider: context.providers?.[binding.dataProviderName],
    tenant: context.tenantCacheKey?.__svadminTenant,
    meta: binding.meta,
  });
  let spinning = $state(false);
  let failed = $state(false);
  let active: object | undefined;
  let previousScope: typeof scope | undefined;

  $effect(() => {
    if (previousScope !== scope) {
      active = undefined;
      spinning = false;
      failed = false;
      previousScope = scope;
    }
  });
  $effect(() => () => {
    active = undefined;
  });

  async function refresh() {
    if (spinning) return;
    const token = {};
    const capturedScope = scope;
    previousScope = capturedScope;
    active = token;
    spinning = true;
    failed = false;
    try {
      await invalidate({ invalidates: ['list', 'many'] });
    } catch {
      if (active === token && scope === capturedScope) failed = true;
    } finally {
      if (active === token && scope === capturedScope) {
        active = undefined;
        spinning = false;
      }
    }
  }

  const displayText = $derived(label ?? i18n.t('common.refresh'));
</script>

<Button
  variant="ghost"
  size={hideText ? 'icon' : 'sm'}
  class={className}
  aria-label={hideText ? displayText : undefined}
  aria-busy={spinning}
  disabled={spinning}
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
{#if failed}
  <p role="alert">{i18n.t('common.error')}</p>
{/if}
