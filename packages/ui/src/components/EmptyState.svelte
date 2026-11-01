<script lang="ts">
  import type { Snippet } from 'svelte';
  import { PackageOpen } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core';
  import { useComponentConfig } from './ConfigProvider.svelte';

  const i18n = useTranslation();
  const config = useComponentConfig();

  let {
    title,
    description,
    image,
    imageAlt,
    icon,
    children,
  } = $props<{
    title?: string;
    description?: string;
    /** Optional illustration URL. Mirrors the reference `image` prop. */
    image?: string;
    imageAlt?: string;
    /** Optional custom icon slot; ignored when `image` is set. */
    icon?: Snippet;
    children?: Snippet;
  }>();

  function textDefault(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  const emptyDefaults = $derived(config.empty);
  const componentEmpty = $derived(config.componentDefaults.Empty ?? {});
  const resolvedTitle = $derived(title ?? emptyDefaults.title ?? textDefault(componentEmpty.title) ?? i18n.t('empty.title'));
  const resolvedDescription = $derived(description ?? emptyDefaults.description ?? textDefault(componentEmpty.description) ?? i18n.t('empty.description'));
  const resolvedImage = $derived(image ?? emptyDefaults.image ?? textDefault(componentEmpty.image));
  const resolvedImageAlt = $derived(imageAlt ?? emptyDefaults.imageAlt ?? textDefault(componentEmpty.imageAlt) ?? '');
</script>

<div
  class="empty-state"
  role="status"
  aria-live="polite"
>
  <span class="empty-state__icon" aria-hidden="true">
    {#if resolvedImage}
      <img class="empty-state__image" src={resolvedImage} alt={resolvedImageAlt} loading="lazy" decoding="async" />
    {:else if icon}
      {@render icon()}
    {:else}
      <PackageOpen size={16} />
    {/if}
  </span>
  <div class="empty-state__body">
    <h3>{resolvedTitle}</h3>
    {#if resolvedDescription}<p>{resolvedDescription}</p>{/if}
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
