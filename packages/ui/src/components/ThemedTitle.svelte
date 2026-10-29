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

<div class="flex items-center gap-2 {wrapperStyles}">
  {#if titleIcon}
    <img src={titleIcon} alt="" class="h-6 w-6 shrink-0" />
  {:else}
    <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
      {titleText.charAt(0).toUpperCase()}
    </div>
  {/if}
  {#if !collapsed}
    <span class="text-lg font-semibold text-foreground truncate">{titleText}</span>
  {/if}
</div>
