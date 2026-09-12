<script lang="ts">
  import type { Snippet } from 'svelte';
  import { captureAdminContext, captureAuthSession, useCan, useTranslation, useImport, useResourceContract,
    type ImportResult, type ContractSchemas } from '@svadmin/core';
  import { definedOptions, definedReactiveOptions } from '@svadmin/core/options';
  import { Button } from '../ui/button/index.js';
  import { Upload } from '@lucide/svelte';
  import type { ButtonAccessControl } from './access-control';

  const i18n = useTranslation();

  interface Props {
    resource: string;
    label?: string;
    children?: Snippet;
    hideText?: boolean;
    onFinish?: (result: ImportResult<ContractSchemas>) => void | Promise<void>;
    mapData?: (row: Record<string, unknown>) => unknown;
    accessControl?: ButtonAccessControl;
    class?: string;
  }
  let {
    resource, label, children, hideText = false, onFinish, mapData,
    accessControl = { enabled: true, hideIfUnauthorized: true }, class: className = '',
  }: Props = $props();

  let fileInput: HTMLInputElement | undefined = $state();

  const context = captureAdminContext();
  const binding = useResourceContract(() => resource);
  const can = useCan(() => definedOptions({
    resource,
    action: 'import',
    params: accessControl?.params,
    meta: accessControl?.meta,
    queryOptions: { enabled: accessControl?.enabled ?? true },
  }));
  const session = $derived(captureAuthSession(context.authProvider));
  const policyAllowed = $derived(accessControl.enabled === false || can.allowed === true);
  const allowed = $derived(policyAllowed && session.available);
  const canCreate = $derived(context.getResource(resource).canCreate !== false);
  const hidden = $derived(!canCreate ||
    (accessControl.hideIfUnauthorized && !allowed));
  const importHook = useImport(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    get enabled() { return policyAllowed && canCreate; },
    get onFinish() { return onFinish; },
    get mapData() { return mapData; },
  }));
  const scope = $derived({
    contract: binding.resource, provider: context.providers?.[binding.dataProviderName],
    tenant: context.tenantCacheKey?.__svadminTenant, meta: binding.meta, allowed, hidden,
    auth: context.authProvider, router: context.routerProvider, session,
  });
  let mounted = true;
  let picker: { scope: typeof scope; input: HTMLInputElement } | undefined;
  let selection: object | undefined;
  const currentScope = (origin: typeof scope) => mounted && scope === origin && origin.session.isCurrent();
  $effect.pre(() => { void scope; picker = undefined; selection = undefined; });
  $effect(() => () => { mounted = false; picker = undefined; selection = undefined; });

  const triggerImport = $derived.by(() => {
    const origin = scope;
    return () => {
      if (!currentScope(origin) || !allowed || hidden || importHook.isLoading || !fileInput) return;
      picker = { scope: origin, input: fileInput };
      fileInput.click();
    };
  });

  const handleFileChange = $derived.by(() => {
    const origin = scope;
    return async (event: Event) => {
      const input = event.currentTarget;
      if (!(input instanceof HTMLInputElement) || !currentScope(origin) || picker?.scope !== origin ||
        picker.input !== input || !allowed || hidden || importHook.isLoading) return;
      const token = {};
      selection = token;
      picker = undefined;
      try {
        const file = input.files?.[0];
        if (file) await importHook.handleChange({ file });
      } catch {
        // The hook exposes a sanitized error; event handlers must not reject globally.
      } finally {
        if (currentScope(origin) && selection === token && fileInput === input) {
          input.value = '';
          selection = undefined;
        }
      }
    };
  });

  const displayText = $derived(label ?? i18n.t('common.import'));
</script>

{#if !hidden}
  {#key scope}
    <input
      type="file"
      accept={importHook.inputProps.accept}
      class="svadmin-u-99d72c7fc3e2"
      bind:this={fileInput}
      onchange={handleFileChange}
    />
  {/key}  <Button
    type="button"
    variant="outline"
    size={hideText ? 'icon' : 'sm'}
    class={className}
    aria-label={hideText ? displayText : undefined}
    disabled={importHook.isLoading || !allowed}
    aria-busy={importHook.isLoading}
    onclick={triggerImport}
  >
    <Upload class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
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
  {#if importHook.error}
    <p role="alert">{i18n.t('common.operationFailed')}</p>
  {/if}
{/if}
