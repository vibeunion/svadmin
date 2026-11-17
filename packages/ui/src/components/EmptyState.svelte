<script lang="ts">
  import type { Snippet } from "svelte";
  import { PackageOpen } from "@lucide/svelte";
  import { useTranslation } from "@svadmin/core";
  import { useComponentConfig } from "./ConfigProvider.svelte";
  import { cn } from "../utils.js";

  const i18n = useTranslation();
  const config = useComponentConfig();

  let {
    title,
    description,
    image,
    imgSrc,
    imageAlt,
    icon,
    layout = "vertical",
    class: className = "",
    children,
  }: {
    title?: string;
    description?: string;
    /** Optional illustration URL. Mirrors the reference `image` prop. */
    image?: string;
    /** Alias for `image` matching Arco Design `imgSrc`. */
    imgSrc?: string;
    imageAlt?: string;
    /** Optional custom icon slot; ignored when `image` is set. */
    icon?: Snippet;
    layout?: "vertical" | "horizontal";
    class?: string;
    children?: Snippet;
  } = $props();

  function textDefault(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
  }

  const emptyDefaults = $derived(config.empty);
  const componentEmpty = $derived(config.componentDefaults["Empty"] ?? {});
  const resolvedTitle = $derived(title ?? emptyDefaults.title ?? textDefault(componentEmpty["title"]) ?? i18n.t("empty.title"));
  const resolvedDescription = $derived(description ?? emptyDefaults.description ?? textDefault(componentEmpty["description"]) ?? i18n.t("empty.description"));
  const resolvedImage = $derived(imgSrc ?? image ?? emptyDefaults.image ?? textDefault(componentEmpty["image"]));
  const resolvedImageAlt = $derived(imageAlt ?? emptyDefaults.imageAlt ?? textDefault(componentEmpty["imageAlt"]) ?? "");
</script>

<div
  class={cn("empty-state", layout === "vertical" ? "empty-state--vertical" : "empty-state--horizontal", className)}
  data-layout={layout}
  role="status"
  aria-live="polite"
>
  <span class="empty-state__icon" aria-hidden="true">
    {#if resolvedImage}
      <img class="empty-state__image" src={resolvedImage} alt={resolvedImageAlt} loading="lazy" decoding="async" />
    {:else if icon}
      {@render icon()}
    {:else}
      <PackageOpen size={layout === "vertical" ? 32 : 16} />
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
  .empty-state { color: var(--foreground); }
  .empty-state--horizontal { display: flex; align-items: flex-start; gap: 12px; padding: 16px; text-align: left; }
  .empty-state--horizontal .empty-state__icon { display: flex; align-items: center; justify-content: center; flex: 0 0 32px; height: 32px; border-radius: var(--radius); background: var(--muted); color: var(--muted-foreground); overflow: hidden; }
  .empty-state--horizontal .empty-state__body { min-width: 0; flex: 1; overflow-wrap: anywhere; }
  .empty-state--horizontal h3 { margin: 0; font-size: var(--svadmin-text-body); line-height: 1.5715; font-weight: 500; letter-spacing: 0; }
  .empty-state--horizontal p { margin: 4px 0 0; font-size: var(--svadmin-text-body); line-height: 1.5715; color: var(--muted-foreground); }
  .empty-state--horizontal .empty-state__action { margin-top: 12px; }

  .empty-state--vertical { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; text-align: center; }
  .empty-state--vertical .empty-state__icon { display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: var(--muted); color: var(--muted-foreground); overflow: hidden; margin-bottom: 12px; }
  .empty-state--vertical .empty-state__body { display: flex; flex-direction: column; align-items: center; max-width: 24rem; }
  .empty-state--vertical h3 { margin: 0; font-size: var(--svadmin-text-section); font-weight: 600; color: var(--foreground); }
  .empty-state--vertical p { margin: 4px 0 0; font-size: var(--svadmin-text-body); color: var(--muted-foreground); line-height: 1.5715; }
  .empty-state--vertical .empty-state__action { margin-top: 16px; }

  .empty-state__image { width: 100%; height: 100%; object-fit: contain; }
</style>
