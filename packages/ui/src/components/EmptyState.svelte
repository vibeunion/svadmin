<script lang="ts">
  import type { Snippet } from 'svelte';
  import { PackageOpen } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core';

  const i18n = useTranslation();

  let {
    title = i18n.t('empty.title'),
    description = i18n.t('empty.description'),
    image,
    imageAlt,
    icon,
    children,
  } = $props<{
    title?: string;
    description?: string;
    /** Optional illustration URL. Mirrors Arco's `image` prop. */
    image?: string;
    imageAlt?: string;
    /** Optional custom icon slot; ignored when `image` is set. */
    icon?: Snippet;
    children?: Snippet;
  }>();
</script>

<div
  class="empty-state"
  role="status"
  aria-live="polite"
>
  <span class="empty-state__icon" aria-hidden="true">
    {#if image}
      <img class="empty-state__image" src={image} alt={imageAlt ?? ''} loading="lazy" decoding="async" />
    {:else if icon}
      {@render icon()}
    {:else}
      <PackageOpen size={16} />
    {/if}
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
  .empty-state__icon { display: flex; align-items: center; justify-content: center; flex: 0 0 32px; height: 32px; border-radius: 6px; background: var(--muted); color: var(--muted-foreground); overflow: hidden; }
  .empty-state__image { width: 100%; height: 100%; object-fit: contain; }
  .empty-state__body { min-width: 0; flex: 1; overflow-wrap: anywhere; }
  h3 { margin: 0; font-size: var(--svadmin-text-label); line-height: var(--svadmin-leading-body); font-weight: 600; letter-spacing: 0; }
  p { margin: var(--svadmin-space-1) 0 0; font-size: var(--svadmin-text-label); line-height: var(--svadmin-leading-body); color: var(--muted-foreground); }
  .empty-state__action { margin-top: 12px; }
</style>
