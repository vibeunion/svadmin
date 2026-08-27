<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "../utils.js";
  import * as Sheet from "./ui/sheet/index.js";

  type Props = WithElementRef<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    open?: boolean;
    title?: string;
    titleId?: string;
    description?: string;
    descriptionId?: string;
    closeLabel?: string;
    side?: "left" | "right";
    width?: string;
    onClose?: () => void;
    children?: Snippet;
    footer?: Snippet;
    extra?: Snippet;
  };

  let {
    open = $bindable(false),
    title = "",
    description = "",
    side = "right",
    width = "max-w-md w-full sm:max-w-lg",
    ref = $bindable(null),
    class: className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    titleId,
    descriptionId,
    closeLabel = "Close",
    onClose,
    children,
    footer,
    extra,
    ...restProps
  }: Props = $props();

  function handleClose() {
    open = false;
    onClose?.();
  }
</script>

<Sheet.Root
  bind:ref
  bind:open
  {side}
  onClose={handleClose}
  {closeLabel}
  class={cn("gap-0 p-0 overflow-hidden", width, className)}
  role="dialog"
  aria-modal="true"
  aria-label={(ariaLabelledby || titleId) ? ariaLabel : (ariaLabel || title || "Details")}
  aria-labelledby={ariaLabelledby || (titleId ? titleId : undefined)}
  aria-describedby={ariaDescribedby || (descriptionId ? descriptionId : undefined)}
  {...restProps}
>
  <Sheet.Content class="flex h-full flex-col gap-0 p-0">
    {#if title || description || extra}
      <Sheet.Header class="flex-shrink-0 border-b border-border px-6 py-4 pr-12">
        <div class="flex items-start justify-between gap-4">
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            {#if title}
              <Sheet.Title id={titleId}>{title}</Sheet.Title>
            {/if}
            {#if description}
              <Sheet.Description id={descriptionId}>{description}</Sheet.Description>
            {/if}
          </div>
          {#if extra}
            <div class="flex flex-shrink-0 items-center gap-2">
              {@render extra()}
            </div>
          {/if}
        </div>
      </Sheet.Header>
    {/if}

    <div class="flex-1 overflow-y-auto p-6">
      {#if children}
        {@render children()}
      {/if}
    </div>

    {#if footer}
      <Sheet.Footer class="mt-auto flex-shrink-0 border-t border-border px-6 py-4">
        {@render footer()}
      </Sheet.Footer>
    {/if}
  </Sheet.Content>
</Sheet.Root>
