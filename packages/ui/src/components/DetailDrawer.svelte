<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
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
    onCloseRequest?: (close: () => void) => void;
    children?: Snippet;
    footer?: Snippet;
    extra?: Snippet;
  };

  let {
    open = $bindable(false),
    title = "",
    description = "",
    side = "right",
    width = "svadmin-u-9794ab45094d svadmin-u-6da6a3c3f741 svadmin-u-a09a722d3ce4",
    ref = $bindable(null),
    class: className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    titleId,
    descriptionId,
    closeLabel = "Close",
    onClose,
    onCloseRequest,
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
  {...definedOptions({ onCloseRequest })}
  {closeLabel}
  class={cn("svadmin-u-63a285be6490 svadmin-u-8a539c7fe216 svadmin-u-2cd02d11d1af", width, className)}
  role="dialog"
  aria-modal="true"
  aria-label={(ariaLabelledby || titleId) ? ariaLabel : (ariaLabel || title || "Details")}
  aria-labelledby={ariaLabelledby || (titleId ? titleId : undefined)}
  aria-describedby={ariaDescribedby || (descriptionId ? descriptionId : undefined)}
  {...restProps}
>
  <Sheet.Content class="svadmin-u-60fbb7713999 svadmin-u-668b21aa5409 svadmin-u-8dddea0773ed svadmin-u-63a285be6490 svadmin-u-8a539c7fe216">
    {#if title || description || extra}
      <Sheet.Header class="svadmin-u-2074a75bf2e7 svadmin-u-65fdbade2025 svadmin-u-18049387f0af svadmin-u-f92d02360b8f svadmin-u-cb11fec3bb46 svadmin-u-ab82c25c24ec">
        <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-8ef2268efbbc svadmin-u-0c3bc98565dd">
          <div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c svadmin-u-8dddea0773ed svadmin-u-58284b4ea568">
            {#if title}
              <Sheet.Title id={titleId}>{title}</Sheet.Title>
            {/if}
            {#if description}
              <Sheet.Description id={descriptionId}>{description}</Sheet.Description>
            {/if}
          </div>
          {#if extra}
            <div class="svadmin-u-60fbb7713999 svadmin-u-2074a75bf2e7 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
              {@render extra()}
            </div>
          {/if}
        </div>
      </Sheet.Header>
    {/if}

    <div class="svadmin-u-36e579c0b41c svadmin-u-92bf82f493b1 svadmin-u-0478c89a150f">
      {#if children}
        {@render children()}
      {/if}
    </div>

    {#if footer}
      <Sheet.Footer class="svadmin-u-9953408a8ef3 svadmin-u-2074a75bf2e7 svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-f92d02360b8f svadmin-u-cb11fec3bb46">
        {@render footer()}
      </Sheet.Footer>
    {/if}
  </Sheet.Content>
</Sheet.Root>
