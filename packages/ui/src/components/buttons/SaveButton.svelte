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
  disabled={loading}
>
  {#if loading}
    <Loader2 class="h-4 w-4 animate-spin" />
  {:else}
    <Save class="h-4 w-4" />
  {/if}
  {#if !hideText}
    <span class="ml-1">
      {#if children}
        {@render children()}
      {:else}
        {displayText}
      {/if}
    </span>
  {/if}
</Button>
