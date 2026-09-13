<script lang="ts">
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import AutoForm from './AutoForm.svelte';
  import DetailDrawer from './DetailDrawer.svelte';

  let { resourceName, recordId, onClose }: {
    resourceName: string;
    recordId: string | number;
    onClose: () => void;
  } = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
  const resource = $derived(context.getResource(resourceName));
  let open = $state(true);
  let guardClose = $state<(close: () => void) => void>(() => {});
</script>

<DetailDrawer
  bind:open
  title={`${i18n.t('common.edit')} ${resource.label}`}
  description={`#${recordId}`}
  closeLabel={i18n.t('common.close')}
  {onClose}
  onCloseRequest={(close) => guardClose(close)}
  data-svadmin-quick-edit
>
  <AutoForm
    {resourceName}
    id={recordId}
    mode="edit"
    density="compact"
    showHeader={false}
    redirect={false}
    onSuccess={onClose}
    onCancel={onClose}
    onNavigationGuardReady={(guard) => guardClose = guard}
  />
</DetailDrawer>
