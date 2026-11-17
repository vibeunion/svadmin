<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAnchorAttributes } from "svelte/elements";
  import { ExternalLink, Loader2 } from "@lucide/svelte";
  import { cn } from "../utils.js";

  type LinkStatus = "default" | "success" | "warning" | "danger" | "error";

  let {
    href,
    disabled = false,
    loading = false,
    status = "default",
    hoverable = true,
    icon = false,
    class: className,
    children,
    ...rest
  }: HTMLAnchorAttributes & {
    disabled?: boolean;
    loading?: boolean;
    status?: LinkStatus;
    hoverable?: boolean;
    icon?: boolean | Snippet;
    children?: Snippet;
  } = $props();

  const normalizedStatus = $derived(status === "error" ? "danger" : status);
  const isDisabled = $derived(disabled || loading);
</script>

<a
  {...rest}
  href={isDisabled ? undefined : href}
  aria-disabled={isDisabled ? "true" : undefined}
  aria-busy={loading ? "true" : undefined}
  data-slot="link"
  data-status={normalizedStatus}
  data-hoverable={hoverable ? "true" : undefined}
  class={cn("svadmin-link inline-flex items-center gap-1", !hoverable && "hover:bg-transparent", loading && "pointer-events-none opacity-60", className)}
>
  {#if loading}
    <Loader2 class="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
  {/if}
  {@render children?.()}
  {#if typeof icon === 'function'}
    {@render icon()}
  {:else if icon}
    <ExternalLink class="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
  {/if}
</a>
