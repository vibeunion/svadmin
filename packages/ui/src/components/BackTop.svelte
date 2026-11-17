<script lang="ts">
  import type { Snippet } from "svelte";
  import { ChevronUp } from "@lucide/svelte";
  import { cn } from "../utils.js";

  interface Props {
    threshold?: number;
    visibleHeight?: number;
    target?: string | HTMLElement | Window | undefined;
    label?: string;
    class?: string;
    style?: string;
    duration?: number;
    children?: Snippet;
    onclick?: () => void;
    onClick?: () => void;
  }

  let {
    threshold = 200,
    visibleHeight,
    target,
    label = "回到顶部",
    class: className = "",
    style,
    duration,
    children,
    onclick,
    onClick,
  }: Props = $props();

  let visible = $state(false);
  const effectiveThreshold = $derived(visibleHeight ?? threshold);

  function resolveTarget(): HTMLElement | Window | null {
    if (typeof window === "undefined") return null;
    if (!target) return window;
    if (typeof target === "string") return document.querySelector(target);
    return target;
  }

  $effect(() => {
    const el = resolveTarget();
    if (!el) return;
    const check = () => {
      const isWin = el === window || (typeof Window !== "undefined" && el instanceof Window);
      const scrollY = isWin ? (window.scrollY ?? window.pageYOffset ?? 0) : (el as HTMLElement).scrollTop;
      visible = scrollY >= effectiveThreshold;
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  });

  function scrollTop() {
    const el = resolveTarget();
    if (!el) return;
    // `duration` 只影响平滑滚动的节奏提示；系统减少动效时直接跳转。
    const reduceMotion = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = duration === 0 || reduceMotion ? "auto" : "smooth";
    el.scrollTo({ top: 0, behavior });
    onclick?.();
    onClick?.();
  }
</script>

{#if visible}
  <button
    type="button"
    class={cn("svadmin-back-top", className)}
    {style}
    onclick={scrollTop}
    aria-label={label}
    title={label}
    data-svadmin-component="BackTop"
  >
    {#if children}
      {@render children()}
    {:else}
      <ChevronUp size={16} aria-hidden="true" />
    {/if}
  </button>
{/if}
