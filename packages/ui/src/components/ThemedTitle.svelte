<script lang="ts">
  import { getAdminOptions } from '@svadmin/core';

  let {
    collapsed = false,
    icon,
    text,
    wrapperStyles = '',
  } = $props<{
    collapsed?: boolean;
    icon?: string;
    text?: string;
    wrapperStyles?: string;
  }>();

  const adminOptions = getAdminOptions();
  const titleText = $derived(text ?? adminOptions.title?.text ?? 'Admin');
  const titleIcon = $derived(icon ?? adminOptions.title?.icon);
</script>

<div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 {wrapperStyles}">
  {#if titleIcon}
    <img src={titleIcon} alt="" class="svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-012fbd121f37" />
  {:else}
    <div class="svadmin-u-60fbb7713999 svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-5f22e64f2282 svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2 svadmin-u-fc7473ca09eb svadmin-u-69450ef1487e">
      {titleText.charAt(0).toUpperCase()}
    </div>
  {/if}
  {#if !collapsed}
    <span class="svadmin-u-42536e69e639 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-f283ea9bea0e">{titleText}</span>
  {/if}
</div>
