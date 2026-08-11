<script lang="ts">
  import { t } from '@svadmin/core/i18n';
  import { Trash2 } from '@lucide/svelte';

  interface Props {
    resource: string;
    recordItemId: string | number;
    basePath?: string;
    hideText?: boolean;
    class?: string;
    size?: 'sm' | 'default' | 'icon';
    redirectUrl?: string;
  }

  let {
    resource,
    recordItemId,
    basePath = '/lite',
    hideText = false,
    class: className = '',
    size = 'default',
    redirectUrl = ''
  }: Props = $props();
</script>

<details class="lite-confirm-details {className}">
  <summary 
    class="lite-btn lite-btn-danger {size === 'sm' ? 'lite-btn-sm' : ''}"
    title={t('common.delete') || 'Delete'}
  >
    <Trash2 size={16} />
    {#if !hideText}
      <span style="margin-left: 4px">{t('common.delete') || 'Delete'}</span>
    {/if}
  </summary>
  <div class="lite-confirm-panel" style="right: 0; left: auto;">
    <p style="margin: 0 0 8px; font-size: 13px; color: #111827;">
      {t('common.areYouSure') || 'Are you sure?'}
    </p>
    <form method="POST" action={`${basePath}/${resource}?/delete`} style="display:inline-flex; gap: 8px;">
      <input type="hidden" name="id" value={String(recordItemId)} />
      {#if redirectUrl}
        <input type="hidden" name="redirect" value={redirectUrl} />
      {/if}
      <button 
        type="button" 
        class="lite-btn lite-btn-sm" 
        onclick={(e) => (e.currentTarget as HTMLElement).closest('details')?.removeAttribute('open')}
      >
        {t('common.cancel') || 'Cancel'}
      </button>
      <button type="submit" class="lite-btn lite-btn-sm lite-btn-danger">
        {t('common.confirm') || 'Confirm'}
      </button>
    </form>
  </div>
</details>
