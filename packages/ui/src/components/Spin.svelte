<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "../utils.js";

  type SpinSize = "mini" | "small" | "default" | "large" | number;

  interface Props {
    loading?: boolean;
    tip?: string | Snippet;
    size?: SpinSize;
    dot?: boolean;
    icon?: Snippet;
    element?: Snippet;
    delay?: number;
    class?: string;
    children?: Snippet;
  }

  let {
    loading = true,
    tip = "",
    size = "default",
    dot = false,
    icon,
    element,
    delay = 0,
    class: className = "",
    children,
  }: Props = $props();

  const resolvedIcon = $derived(element ?? icon);

  // svelte-ignore state_referenced_locally
  let visibleLoading = $state(loading && delay <= 0);

  $effect(() => {
    if (!loading) {
      visibleLoading = false;
      return;
    }
    if (delay <= 0) {
      visibleLoading = true;
      return;
    }
    const timer = setTimeout(() => {
      visibleLoading = true;
    }, delay);
    return () => clearTimeout(timer);
  });

  const isNumericSize = $derived(typeof size === "number");
  const sizeStyle = $derived(isNumericSize ? `width: ${size}px; height: ${size}px;` : undefined);

  const iconSizeClass = $derived.by(() => {
    if (isNumericSize) return "";
    switch (size) {
      case "mini":
        return "size-3 border-[1.5px]";
      case "small":
        return "size-3.5 border-[1.5px]";
      case "large":
        return "size-6 border-2";
      case "default":
      default:
        return "size-4 border-2";
    }
  });

  const dotContainerSizeClass = $derived.by(() => {
    if (isNumericSize) return "";
    switch (size) {
      case "mini":
        return "size-3";
      case "small":
        return "size-3.5";
      case "large":
        return "size-6";
      case "default":
      default:
        return "size-4";
    }
  });
</script>

{#snippet spinIndicator()}
  {#if resolvedIcon}
    <span class="svadmin-spin__custom-icon" style={sizeStyle} aria-hidden="true">
      {@render resolvedIcon()}
    </span>
  {:else if dot}
    <span
      class={cn("svadmin-spin__dots", dotContainerSizeClass)}
      style={sizeStyle}
      aria-hidden="true"
    >
      <i class="svadmin-spin__dot-item"></i>
      <i class="svadmin-spin__dot-item"></i>
      <i class="svadmin-spin__dot-item"></i>
      <i class="svadmin-spin__dot-item"></i>
    </span>
  {:else}
    <span
      class={cn("svadmin-spin__icon", iconSizeClass)}
      style={sizeStyle}
      aria-hidden="true"
    ></span>
  {/if}
{/snippet}

{#if children}
  <div class={cn("svadmin-spin-container relative", className)}>
    <div class={cn("svadmin-spin-children transition-opacity duration-200", visibleLoading && "opacity-40 pointer-events-none select-none")}>
      {@render children()}
    </div>
    {#if visibleLoading}
      <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10" role="status" aria-live="polite">
        {@render spinIndicator()}
        {#if tip}
          <span class="svadmin-spin__tip text-xs font-medium">
            {#if typeof tip === "string"}
              {tip}
            {:else}
              {@render tip()}
            {/if}
          </span>
        {/if}
      </div>
    {/if}
  </div>
{:else if visibleLoading}
  <div class={cn("svadmin-spin inline-flex items-center gap-2", className)} role="status" aria-live="polite">
    {@render spinIndicator()}
    {#if tip}
      <span class="svadmin-spin__tip text-xs">
        {#if typeof tip === "string"}
          {tip}
        {:else}
          {@render tip()}
        {/if}
      </span>
    {/if}
  </div>
{/if}

<style>
  .svadmin-spin__dots {
    display: inline-grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2px;
    animation: svadmin-spin-dots-rotate 1.2s linear infinite;
  }
  .svadmin-spin__dot-item {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 9999px;
    background-color: currentColor;
    animation: svadmin-spin-dot-pulse 1.2s ease-in-out infinite alternate;
  }
  .svadmin-spin__dot-item:nth-child(1) { animation-delay: 0s; }
  .svadmin-spin__dot-item:nth-child(2) { animation-delay: 0.3s; }
  .svadmin-spin__dot-item:nth-child(3) { animation-delay: 0.9s; }
  .svadmin-spin__dot-item:nth-child(4) { animation-delay: 0.6s; }

  @keyframes svadmin-spin-dots-rotate {
    to { transform: rotate(360deg); }
  }
  @keyframes svadmin-spin-dot-pulse {
    0% { opacity: 0.3; transform: scale(0.75); }
    100% { opacity: 1; transform: scale(1); }
  }
</style>
