<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useTranslation } from '@svadmin/core';
  import { Button } from '../ui/button/index.js';
  import { Save, Loader2 } from '@lucide/svelte';

  const i18n = useTranslation();

  let {
    loading = false,
    label,
    children,
    hideText = false,
    type = 'submit',
    class: className = '',
  } = $props<{
    loading?: boolean;
    label?: string;
    children?: Snippet;
    hideText?: boolean;
    type?: 'submit' | 'button';
    class?: string;
  }>();

  const displayText = $derived(label ?? i18n.t('common.save'));
</script>

<Button
  {type}
  variant="default"
  size={hideText ? 'icon' : 'default'}
  class={className}
  aria-label={hideText ? displayText : undefined}
  disabled={loading}
>
  {#if loading}
    <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e" />
  {:else}
    <Save class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
  {/if}
  {#if !hideText}
    <span class="svadmin-u-f58b02572ab2">
      {#if children}
        {@render children()}
      {:else}
        {displayText}
      {/if}
    </span>
  {/if}
</Button>
