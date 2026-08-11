<script lang="ts">
  import { t } from '@svadmin/core/i18n';
  import { Plus } from '@lucide/svelte';

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
  href={`${basePath}/${resource}/create`}
  class="lite-btn lite-btn-primary {size === 'sm' ? 'lite-btn-sm' : ''} {className}"
  title={t('common.create') || 'Create'}
>
  <Plus size={16} />
  {#if !hideText}
    <span style="margin-left: 4px">{t('common.create') || 'Create'}</span>
  {/if}
</a>
