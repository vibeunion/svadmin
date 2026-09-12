<script lang="ts">
  import { definedOptions, definedReactiveOptions } from '@svadmin/core/options';

  import type { Snippet } from 'svelte';
  import { captureAdminContext, captureAuthSession, useResourceContract, useDelete, useCan, useTranslation, UndoError } from '@svadmin/core';
  import { Button } from '../ui/button/index.js';
  import { Trash2 } from '@lucide/svelte';
  import type { ButtonAccessControl } from './access-control';

  const i18n = useTranslation();

  let {
    resource,
    recordItemId,
    label,
    children,
    hideText = false,
    accessControl = { enabled: true, hideIfUnauthorized: true },
    onSuccess,
    undoable = false,
    undoableTimeout,
    variables,
    class: className = '',
  }: {
    resource: string;
    recordItemId: string | number;
    label?: string;
    children?: Snippet;
    hideText?: boolean;
    accessControl?: ButtonAccessControl;
    onSuccess?: () => void;
    undoable?: boolean;
    undoableTimeout?: number;
    variables?: unknown;
    class?: string;
  } = $props();

  const binding = useResourceContract(() => resource);
  const context = captureAdminContext();
  const resourceDefinition = $derived(context.getResource(resource));
  const can = useCan(() => (definedOptions({
    resource,
    action: 'delete',
    id: recordItemId,
    params: accessControl?.params,
    meta: accessControl?.meta,
    queryOptions: { enabled: accessControl?.enabled ?? true }
  })));
  const displayText = $derived(label ?? i18n.t('common.delete'));
  const session = $derived(captureAuthSession(context.authProvider));
  const policyAllowed = $derived(accessControl.enabled === false || can.allowed === true);
  const allowed = $derived(session.available && policyAllowed);
  const hidden = $derived(!can.isLoading && (resourceDefinition.canDelete === false || (accessControl.hideIfUnauthorized && !allowed)));
  const deleteMut = useDelete(definedReactiveOptions({
    get resource() { return binding.resource; },
    get id() { return recordItemId; },
    get enabled() { return policyAllowed && resourceDefinition.canDelete !== false; },
    get undoable() { return undoable; },
    get undoableTimeout() { return undoableTimeout; },
  }));
  let confirming = $state(false);
  let pending = $state(false);
  let failed = $state(false);
  const scope = $derived({
    contract: binding.resource, id: recordItemId, variables,
    provider: context.providers?.[binding.dataProviderName],
    tenant: context.tenantCacheKey?.__svadminTenant,
    meta: binding.meta, allowed, hidden, auth: context.authProvider, session,
  });
  let confirmationScope = $state.raw<typeof scope>();
  let previousScope: typeof scope | undefined;
  let active: object | undefined;
  $effect(() => {
    if (previousScope !== scope) {
      // The hook owns session retirement; do not cancel its own checked logout delegate.
      if (active && previousScope?.session.isCurrent()) deleteMut.mutation.reset();
      previousScope = scope;
      active = undefined;
      confirming = false;
      confirmationScope = undefined;
      pending = false;
      failed = false;
    }
  });
  $effect(() => () => { active = undefined; });

  function beginConfirmation() {
    if (pending || !allowed || hidden || !session.isCurrent()) return;
    confirmationScope = scope;
    confirming = true;
  }

  const confirmDelete = $derived.by(() => {
    const captured = scope;
    return () => handleDelete(captured);
  });
  async function handleDelete(capturedScope: typeof scope) {
    if (pending || !allowed || hidden || !capturedScope.session.isCurrent() ||
      capturedScope !== scope || !confirming || confirmationScope !== capturedScope) return;
    const token = {};
    const success = onSuccess;
    previousScope = capturedScope;
    active = token;
    confirming = false;
    confirmationScope = undefined;
    pending = true;
    failed = false;
    try {
      await deleteMut.mutation.mutateAsync(definedOptions({
        variables, dataProviderName: binding.dataProviderName,
      }));
      if (active === token && scope === capturedScope && capturedScope.session.isCurrent()) success?.();
    } catch (error) {
      if (!(error instanceof UndoError) && active === token && scope === capturedScope && capturedScope.session.isCurrent()) failed = true;
    } finally {
      if (active === token && scope === capturedScope && capturedScope.session.isCurrent()) {
        active = undefined;
        pending = false;
      }
    }
  }

  function cancel() { confirming = false; confirmationScope = undefined; }
</script>

{#if !hidden}
  {#if confirming && confirmationScope === scope && session.isCurrent()}
    <div class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421">
      <Button type="button" variant="destructive" size="sm" disabled={pending || !allowed} onclick={confirmDelete}>        {i18n.t('common.confirm')}
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={pending} onclick={cancel}>
        {i18n.t('common.cancel')}
      </Button>
    </div>
  {:else}
    <Button
      type="button"
      variant="ghost"
      size={hideText ? 'icon' : 'sm'}
      class="svadmin-u-811148b13d1e svadmin-u-51e95020d6f2 {className}"
      aria-label={hideText ? displayText : undefined}
      disabled={pending || !allowed}
      aria-busy={pending}
      onclick={beginConfirmation}
    >
      <Trash2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
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
  {/if}
  {#if failed}
    <p role="alert">{i18n.t('common.error')}</p>
  {/if}
{/if}
