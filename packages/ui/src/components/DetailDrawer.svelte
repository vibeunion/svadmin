<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn, type WithElementRef } from "../utils.js";
  import * as Sheet from "./ui/sheet/index.js";

  type Props = WithElementRef<{
    open?: boolean;
    title?: string;
    description?: string;
    side?: "left" | "right";
    width?: string;
    class?: string;
    onClose?: () => void;
    children?: Snippet;
    footer?: Snippet;
  }>;

  let {
    open = $bindable(false),
    title = "",
    description = "",
    side = "right",
    width = "max-w-md w-full sm:max-w-lg",
    class: className,
    onClose,
    children,
    footer,
    ...restProps
  }: Props = $props();

  function handleClose() {
    open = false;
    onClose?.();
  }
</script>

<Sheet.Root bind:open {side} onClose={handleClose} class={cn("overflow-y-auto", width, className)} {...restProps}>
  <Sheet.Content class="flex flex-col h-full">
    {#if title || description}
      <Sheet.Header>
        {#if title}
          <Sheet.Title>{title}</Sheet.Title>
        {/if}
        {#if description}
          <Sheet.Description>{description}</Sheet.Description>
        {/if}
      </Sheet.Header>
    {/if}

    <div class="flex-1 overflow-y-auto py-2">
      {#if children}
        {@render children()}
      {/if}
    </div>

    {#if footer}
      <Sheet.Footer>
        {@render footer()}
      </Sheet.Footer>
    {/if}
  </Sheet.Content>
</Sheet.Root>
