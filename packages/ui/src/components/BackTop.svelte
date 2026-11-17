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
    children?: Snippet;
    onclick?: () => void;
  }

  let {
    threshold = 200,
    visibleHeight,
    target,
    label = "回到顶部",
    class: className = "",
    children,
    onclick,
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
    const isWin = el === window || (typeof Window !== "undefined" && el instanceof Window);
    if (isWin) {
      el.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      el.scrollTo({ top: 0, behavior: "smooth" });
    }
    onclick?.();
  }
</script>

{#if visible}
  <button
    type="button"
    class={cn("svadmin-back-top", className)}
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
