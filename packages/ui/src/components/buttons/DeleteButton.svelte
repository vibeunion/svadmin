<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useDelete, useCan, useTranslation } from '@svadmin/core';
  import { Button } from '../ui/button/index.js';
  import { Trash2 } from '@lucide/svelte';
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
    onSuccess,
    undoable = false,
    class: className = '',
  } = $props<{
    resource: string;
    recordItemId: string | number;
    label?: string;
    children?: Snippet;
    hideText?: boolean;
    accessControl?: ButtonAccessControl;
    onSuccess?: () => void;
    undoable?: boolean;
    class?: string;
  }>();

  const deleteMut = useDelete({ get resource() { return resource; }, get mutationMode() { return undoable ? 'undoable' as const : 'pessimistic' as const; } });
  const can = useCan(() => ({
    resource,
    action: 'delete',
    params: withRecordId(accessControl?.params, recordItemId),
    meta: accessControl?.meta,
    queryOptions: { enabled: accessControl?.enabled ?? true }
  }));
  const hidden = $derived(accessControl?.hideIfUnauthorized && !can.allowed);
  const displayText = $derived(label ?? i18n.t('common.delete'));
  let confirming = $state(false);

  async function handleDelete() {
    if (!confirming) {
      confirming = true;
      return;
    }
    confirming = false;
    await deleteMut.mutation.mutateAsync({ id: recordItemId, resource });
    onSuccess?.();
  }

  function cancel() { confirming = false; }
</script>

{#if !hidden}
  {#if confirming}
    <div class="inline-flex items-center gap-1">
      <Button variant="destructive" size="sm" onclick={handleDelete}>
        {i18n.t('common.confirm')}
      </Button>
      <Button variant="ghost" size="sm" onclick={cancel}>
        {i18n.t('common.cancel')}
      </Button>
    </div>
  {:else}
    <Button
      variant="ghost"
      size={hideText ? 'icon' : 'sm'}
      class="text-destructive hover:text-destructive {className}"
      aria-label={hideText ? displayText : undefined}
      disabled={!can.allowed}
      onclick={handleDelete}
    >
      <Trash2 class="h-4 w-4" />
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
{/if}
