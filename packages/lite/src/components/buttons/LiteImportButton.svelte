<script lang="ts">
  import { t } from '@svadmin/core/i18n';
  import { Upload } from '@lucide/svelte';

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
</script>

<details class="lite-confirm-details {className}">
  <summary 
    class="lite-btn {size === 'sm' ? 'lite-btn-sm' : ''}"
    title={t('common.import') || 'Import'}
  >
    <Upload size={16} />
    {#if !hideText}
      <span style="margin-left: 4px">{t('common.import') || 'Import'}</span>
    {/if}
  </summary>
  <div class="lite-confirm-panel">
    <p style="margin: 0 0 8px; font-size: 13px;">{t('common.importData') || 'Import data (CSV/JSON)'}</p>
    <form method="POST" action={`${basePath}/${resource}?/${resource}_import`} enctype="multipart/form-data" style="display:flex; flex-direction: column; gap: 8px;">
      <input type="file" name="file" accept=".csv,.json" required style="font-size: 13px;" />
      <div style="display:flex; gap: 8px; justify-content: flex-end;">
        <button 
          type="button" 
          class="lite-btn lite-btn-sm" 
          onclick={(e) => (e.currentTarget as HTMLElement).closest('details')?.removeAttribute('open')}
        >
          {t('common.cancel') || 'Cancel'}
        </button>
        <button type="submit" class="lite-btn lite-btn-sm lite-btn-primary">
          {t('common.upload') || 'Upload'}
        </button>
      </div>
    </form>
  </div>
</details>
