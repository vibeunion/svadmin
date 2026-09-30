<script lang="ts">
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
  class="empty-state"
  role="status"
  aria-live="polite"
>
  <span class="empty-state__icon" aria-hidden="true">
    <PackageOpen size={16} />
  </span>
  <div class="empty-state__body">
    <h3>{title}</h3>
    {#if description}<p>{description}</p>{/if}
    {#if children}
      <div class="empty-state__action">
        {@render children()}
      </div>
    {/if}
  </div>
</div>

<style>
  .empty-state { display: flex; align-items: flex-start; gap: 12px; padding: 16px; text-align: left; color: var(--foreground); }
  .empty-state__icon { display: flex; align-items: center; justify-content: center; flex: 0 0 32px; height: 32px; border-radius: 6px; background: var(--muted); color: var(--muted-foreground); }
  .empty-state__body { min-width: 0; flex: 1; overflow-wrap: anywhere; }
  h3 { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; letter-spacing: 0; }
  p { margin: 4px 0 0; font-size: 14px; line-height: 20px; color: var(--muted-foreground); }
  .empty-state__action { margin-top: 12px; }
</style>
