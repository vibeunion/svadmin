<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import BoundRecordDetailDrawer from './BoundRecordDetailDrawer.svelte';
  import DetailDrawer from './DetailDrawer.svelte';

  let { resourceName, open = $bindable(false), recordId, onClose }: {
    resourceName: string;
    open?: boolean;
    recordId?: string | number;
    onClose?: () => void;
  } = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
</script>

{#if open}
  {#if recordId != null}
    <BoundRecordDetailDrawer {resourceName} {recordId} bind:open {...definedOptions({ onClose })} />
  {:else}
    <DetailDrawer bind:open title="{context.getResource(resourceName).label} {i18n.t('common.detail')}"
      closeLabel={i18n.t('common.close')} {...definedOptions({ onClose })} data-svadmin-record-detail>
      <p>{i18n.t('common.noData')}</p>
    </DetailDrawer>
  {/if}
{/if}