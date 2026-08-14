<script lang="ts">
  import { t } from '@svadmin/core/i18n';
  import { Trash2 } from '@lucide/svelte';
  import { liteFragmentId } from '../../fragment-id';

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

  const componentId = $props.id();
  const confirmationId = $derived(liteFragmentId('delete', componentId, resource, recordItemId));
  const confirmationTitleId = $derived(`${confirmationId}-title`);
</script>

<div class="lite-confirm {className}">
  <span id={`${confirmationId}-closed`} class="lite-confirm-cancel-target" aria-hidden="true"></span>
  <a
    href={`#${confirmationId}`}
    class="lite-btn lite-btn-danger {size === 'sm' ? 'lite-btn-sm' : ''}"
    title={t('common.delete') || 'Delete'}
    aria-controls={confirmationId}
    aria-haspopup="dialog"
  >
    <Trash2 size={16} />
    {#if !hideText}
      <span style="margin-left: 4px">{t('common.delete') || 'Delete'}</span>
    {/if}
  </a>
  <div id={confirmationId} class="lite-confirm-panel lite-confirm-target" style="right: 0; left: auto;" role="dialog" aria-labelledby={confirmationTitleId} tabindex="-1">
    <p id={confirmationTitleId} style="margin: 0 0 8px; font-size: 13px; color: #111827;">
      {t('common.areYouSure') || 'Are you sure?'}
    </p>
    <form method="POST" action={`${basePath}/${resource}?/delete`} class="lite-inline-actions">
      <input type="hidden" name="id" value={String(recordItemId)} />
      {#if redirectUrl}
        <input type="hidden" name="redirect" value={redirectUrl} />
      {/if}
      <a href={`#${confirmationId}-closed`} class="lite-btn lite-btn-sm">
        {t('common.cancel') || 'Cancel'}
      </a>
      <button type="submit" class="lite-btn lite-btn-sm lite-btn-danger">
        {t('common.confirm') || 'Confirm'}
      </button>
    </form>
  </div>
</div>
