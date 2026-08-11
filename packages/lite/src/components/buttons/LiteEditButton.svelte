<script lang="ts">
  import { t } from '@svadmin/core/i18n';
  import { Pencil } from '@lucide/svelte';

  interface Props {
    resource: string;
    recordItemId: string | number;
    basePath?: string;
    hideText?: boolean;
    class?: string;
    size?: 'sm' | 'default' | 'icon';
  }

  let {
    resource,
    recordItemId,
    basePath = '/lite',
    hideText = false,
    class: className = '',
    size = 'default'
  }: Props = $props();
</script>

<a
  href={`${basePath}/${resource}/edit/${recordItemId}`}
  class="lite-btn {size === 'sm' ? 'lite-btn-sm' : ''} {className}"
  title={t('common.edit') || 'Edit'}
>
  <Pencil size={16} />
  {#if !hideText}
    <span style="margin-left: 4px">{t('common.edit') || 'Edit'}</span>
  {/if}
</a>
