<script lang="ts">
  import { t } from '@svadmin/core/i18n';
  import { List } from '@lucide/svelte';

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

<a
  href={`${basePath}/${resource}`}
  class="lite-btn {size === 'sm' ? 'lite-btn-sm' : ''} {className}"
  title={t('common.list') || 'List'}
>
  <List size={16} />
  {#if !hideText}
    <span style="margin-left: 4px">{t('common.list') || 'List'}</span>
  {/if}
</a>
