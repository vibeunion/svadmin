<script lang="ts">
  import { getResource } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Dialog from './ui/dialog/index.js';
  import AutoForm from './AutoForm.svelte';

  const i18n = useTranslation();

  let { resourceName, mode = 'create', id, open = $bindable(false), onSuccess } = $props<{
    resourceName: string;
    mode?: 'create' | 'edit';
    id?: string | number;
    open: boolean;
    onSuccess?: () => void;
  }>();

  const resource = $derived(getResource(resourceName));
  const fieldCount = $derived(resource.fields.filter(f => f.showInForm !== false).length);
  const dialogWidth = $derived(fieldCount > 8 ? 'sm:max-w-3xl' : fieldCount > 5 ? 'sm:max-w-2xl' : 'sm:max-w-lg');

  function handleSuccess() {
    open = false;
    onSuccess?.();
  }
</script>

{#if open}
  <Dialog.Dialog bind:open>
    <Dialog.DialogContent class="{dialogWidth} max-h-[85vh] overflow-y-auto">
      <Dialog.DialogHeader>
        <Dialog.DialogTitle>
          {mode === 'create' ? `${i18n.t('common.create')}${resource.label}` : `${i18n.t('common.edit')}${resource.label}`}
        </Dialog.DialogTitle>
      </Dialog.DialogHeader>
      <AutoForm {resourceName} {mode} {id} showHeader={false} onSuccess={handleSuccess} />
    </Dialog.DialogContent>
  </Dialog.Dialog>
{/if}
