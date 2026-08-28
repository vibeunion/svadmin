<script lang="ts">
  import * as AlertDialog from './ui/alert-dialog/index.js';
  import { Button } from './ui/button/index.js';
  import { Loader2 } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  const i18n = useTranslation();

  let { open = $bindable(false), title, message = '',
    confirmText, cancelText, variant = 'danger',
    confirming = false, onconfirm, oncancel } = $props<{
    open?: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    confirming?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
  }>();

  const variantMap = {
    danger: 'destructive' as const,
    warning: 'destructive' as const,
    info: 'default' as const,
  };

  const resolvedTitle = $derived(title ?? i18n.t('common.confirmAction'));
  const resolvedConfirmText = $derived(confirmText ?? i18n.t('common.confirm'));
  const resolvedCancelText = $derived(cancelText ?? i18n.t('common.cancel'));

  let confirmed = $state(false);

  function handleConfirm() {
    confirmed = true;
    onconfirm();
  }

  function handleOpenChange(v: boolean) {
    if (!v && !confirmed) {
      oncancel();
    }
    if (!v) confirmed = false;
  }
</script>

<AlertDialog.Root bind:open onOpenChange={handleOpenChange}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{resolvedTitle}</AlertDialog.Title>
      <AlertDialog.Description>{message}</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>
        {#snippet child({ props })}
          <Button variant="outline" {...props} disabled={confirming}>
            {resolvedCancelText}
          </Button>
        {/snippet}
      </AlertDialog.Cancel>
      <AlertDialog.Action>
        {#snippet child({ props })}
          <Button variant={variantMap[variant as keyof typeof variantMap]} {...props} disabled={confirming} onclick={handleConfirm}>
            {#if confirming}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {/if}
            {resolvedConfirmText}
          </Button>
        {/snippet}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
