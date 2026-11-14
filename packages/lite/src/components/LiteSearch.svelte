<script lang="ts">
  /**
   * LiteSearch — Search bar using native <form> GET submission.
   * No JS needed — submits as ?q=searchterm via page navigation.
   */
  import { t } from '@svadmin/core/i18n';

  interface Props {
    value?: string;
    placeholder?: string;
    /** Additional hidden fields to preserve (e.g. sort, order) */
    preserveParams?: Record<string, string>;
  }

  let {
    value = '',
    placeholder,
    preserveParams = {},
  }: Props = $props();
</script>

<form method="GET" class="lite-search">
  {#each Object.entries(preserveParams) as [key, val] (key)}
    <input type="hidden" name={key} value={val} />
  {/each}
  <input
    type="text"
    name="q"
    value={value}
    class="lite-input"
    placeholder={placeholder || t('common.search') || 'Search…'}
  />
  <button type="submit" class="lite-btn lite-btn-primary">
    {t('common.search') || 'Search'}
  </button>
  {#if value}
    <a href="?" class="lite-btn" style="margin-left:4px;">
      {t('common.clear') || 'Clear'}
    </a>
  {/if}
</form>
