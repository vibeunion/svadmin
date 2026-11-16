<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAnchorAttributes } from "svelte/elements";
  import { ExternalLink } from "@lucide/svelte";
  import { cn } from "../utils.js";

  type LinkStatus = "default" | "success" | "warning" | "danger";

  let {
    href,
    disabled = false,
    status = "default",
    hoverable = true,
    icon = false,
    class: className,
    children,
    ...rest
  }: HTMLAnchorAttributes & {
    disabled?: boolean;
    status?: LinkStatus;
    hoverable?: boolean;
    icon?: boolean;
    children?: Snippet;
  } = $props();
</script>

<a
  {...rest}
  href={disabled ? undefined : href}
  aria-disabled={disabled ? "true" : undefined}
  data-slot="link"
  data-status={status}
  data-hoverable={hoverable ? "true" : undefined}
  class={cn("svadmin-link inline-flex items-center gap-1", !hoverable && "hover:bg-transparent", className)}
>
  {@render children?.()}
  {#if icon}
    <ExternalLink class="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
  {/if}
</a>
