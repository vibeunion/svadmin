<script lang="ts">
  import { scale } from 'svelte/transition';
  import { PackageOpen } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core';

  const i18n = useTranslation();

  let {
    title = i18n.t('empty.title'),
    description = i18n.t('empty.description'),
    children,
  } = $props<{
    title?: string;
    description?: string;
    children?: import('svelte').Snippet;
  }>();
</script>

<div
  class="flex flex-col items-center justify-center rounded-lg bg-card/50 px-8 py-10 text-center shadow-sm"
  in:scale={{ start: 0.95, duration: 250, opacity: 0 }}
>
  <div class="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
    <PackageOpen class="h-10 w-10 text-muted-foreground" />
  </div>
  <h3 class="text-lg font-semibold tracking-tight">{title}</h3>
  <p class="text-sm text-muted-foreground mt-2 max-w-sm">{description}</p>
  {#if children}
    <div class="mt-6">
      {@render children()}
    </div>
  {/if}
</div>
