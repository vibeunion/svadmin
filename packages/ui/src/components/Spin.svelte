<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "../utils.js";

  interface Props {
    loading?: boolean;
    tip?: string;
    size?: "small" | "default" | "large";
    class?: string;
    children?: Snippet;
  }

  let {
    loading = true,
    tip = "",
    size = "default",
    class: className = "",
    children,
  }: Props = $props();
</script>

{#if children}
  <div class={cn("svadmin-spin-container relative", className)}>
    <div class={cn("svadmin-spin-children transition-opacity duration-200", loading && "opacity-40 pointer-events-none select-none")}>
      {@render children()}
    </div>
    {#if loading}
      <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10" role="status" aria-live="polite">
        <span class={cn("svadmin-spin__icon", size === "small" ? "size-3.5 border-[1.5px]" : size === "large" ? "size-6 border-2" : "size-4 border-2")} aria-hidden="true"></span>
        {#if tip}<span class="svadmin-spin__tip text-xs font-medium">{tip}</span>{/if}
      </div>
    {/if}
  </div>
{:else if loading}
  <div class={cn("svadmin-spin inline-flex items-center gap-2", className)} role="status" aria-live="polite">
    <span class={cn("svadmin-spin__icon", size === "small" ? "size-3.5 border-[1.5px]" : size === "large" ? "size-6 border-2" : "size-4 border-2")} aria-hidden="true"></span>
    {#if tip}<span class="svadmin-spin__tip text-xs">{tip}</span>{/if}
  </div>
{/if}
