<script lang="ts">
  import { t } from '@svadmin/core/i18n';
  import { Upload } from '@lucide/svelte';
  import { liteFragmentId } from '../../fragment-id';

  interface Props {
    resource: string;
    basePath?: string;
    hideText?: boolean;
    class?: string;
    size?: 'sm' | 'default' | 'icon';
  }

  let {
    resource,
    basePath = '/lite',
    hideText = false,
    class: className = '',
    size = 'default'
  }: Props = $props();

  const componentId = $props.id();
  const importPanelId = $derived(liteFragmentId('import', componentId, resource));
  const importPanelTitleId = $derived(`${importPanelId}-title`);
</script>

<div class="lite-confirm {className}">
  <span id={`${importPanelId}-closed`} class="lite-confirm-cancel-target" aria-hidden="true"></span>
  <a
    href={`#${importPanelId}`}
    class="lite-btn {size === 'sm' ? 'lite-btn-sm' : ''}"
    title={t('common.import') || 'Import'}
    aria-controls={importPanelId}
    aria-haspopup="dialog"
  >
    <Upload size={16} />
    {#if !hideText}
      <span style="margin-left: 4px">{t('common.import') || 'Import'}</span>
    {/if}
  </a>
  <div id={importPanelId} class="lite-confirm-panel lite-confirm-target" role="dialog" aria-labelledby={importPanelTitleId} tabindex="-1">
    <p id={importPanelTitleId} style="margin: 0 0 8px; font-size: 13px;">{t('common.importData') || 'Import data (CSV/JSON)'}</p>
    <form method="POST" action={`${basePath}/${resource}?/${resource}_import`} enctype="multipart/form-data" class="lite-stack-sm">
      <input type="file" name="file" accept=".csv,.json" required style="font-size: 13px;" />
      <div class="lite-inline-actions lite-justify-end">
        <a href={`#${importPanelId}-closed`} class="lite-btn lite-btn-sm">
          {t('common.cancel') || 'Cancel'}
        </a>
        <button type="submit" class="lite-btn lite-btn-sm lite-btn-primary">
          {t('common.upload') || 'Upload'}
        </button>
      </div>
    </form>
  </div>
</div>
