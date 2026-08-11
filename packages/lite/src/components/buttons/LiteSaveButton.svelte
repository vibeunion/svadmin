<script lang="ts">
  import { t } from '@svadmin/core/i18n';
  import { Save } from '@lucide/svelte';

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

<button
  type="submit"
  class="lite-btn lite-btn-primary {size === 'sm' ? 'lite-btn-sm' : ''} {className}"
  title={t('common.save') || 'Save'}
>
  <Save size={16} />
  {#if !hideText}
    <span style="margin-left: 4px">{t('common.save') || 'Save'}</span>
  {/if}
</button>
