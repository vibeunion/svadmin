<script lang="ts">
  import { t } from '@svadmin/core/i18n';
  import { Copy } from '@lucide/svelte';

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
  href={`${basePath}/${resource}/clone/${recordItemId}`}
  class="lite-btn {size === 'sm' ? 'lite-btn-sm' : ''} {className}"
  title={t('common.clone') || 'Clone'}
>
  <Copy size={16} />
  {#if !hideText}
    <span style="margin-left: 4px">{t('common.clone') || 'Clone'}</span>
  {/if}
</a>
