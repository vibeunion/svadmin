<script lang="ts">
  import { t } from '@svadmin/core/i18n';
  import { RefreshCw } from '@lucide/svelte';

  interface Props {
    hideText?: boolean;
    class?: string;
    size?: 'sm' | 'default' | 'icon';
  }

  let {
    hideText = false,
    class: className = '',
    size = 'default'
  }: Props = $props();

</script>

<!-- The empty URL intentionally reloads the exact current document, including its query string. -->
<!-- svelte-ignore a11y_invalid_attribute -->
<a
  href=""
  class="lite-btn {size === 'sm' ? 'lite-btn-sm' : ''} {className}"
  title={t('common.refresh') || 'Refresh'}
>
  <RefreshCw size={16} />
  {#if !hideText}
    <span style="margin-left: 4px">{t('common.refresh') || 'Refresh'}</span>
  {/if}
</a>
