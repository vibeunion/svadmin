<script lang="ts">
  import type { Snippet } from "svelte";
  import { untrack } from "svelte";
  import { CircleAlert } from "@lucide/svelte";
  import Button from "./ui/button/button.svelte";
  import * as Popover from "./ui/popover/index.js";
  import * as Dialog from "./ui/dialog/index.js";

  let {
    title,
    content,
    okText = "确定",
    cancelText = "取消",
    okType = "primary",
    risk = "light",
    icon,
    okLoading = false,
    disabled = false,
    popupVisible,
    defaultPopupVisible = false,
    onVisibleChange,
    onConfirm,
    onOk,
    onCancel,
    children,
  }: {
    title: string | Snippet;
    content?: string | Snippet;
    okText?: string;
    cancelText?: string;
    okType?: "primary" | "danger";
    /**
     * light：频繁的轻确认，仍用气泡，宽度不超过 320px。
     * irreversible：有风险或不可逆，改成对话框，不再弹出气泡。
     */
    risk?: "light" | "irreversible";
    icon?: Snippet;
    okLoading?: boolean;
    disabled?: boolean;
    popupVisible?: boolean;
    defaultPopupVisible?: boolean;
    onVisibleChange?: (visible: boolean) => void;
    onConfirm?: () => void;
    onOk?: () => void;
    onCancel?: () => void;
    children: Snippet;
  } = $props();

  let internalOpen = $state(untrack(() => defaultPopupVisible));
  const isControlled = $derived(popupVisible !== undefined);
  const open = $derived(isControlled ? popupVisible! : internalOpen);

  function handleOpenChange(next: boolean) {
    if (!isControlled) internalOpen = next;
    onVisibleChange?.(next);
  }

  function confirm() {
    if (disabled || okLoading) return;
    (onOk ?? onConfirm)?.();
    handleOpenChange(false);
  }

  function cancel() {
    onCancel?.();
    handleOpenChange(false);
  }
</script>

{#if risk === "irreversible"}
  <Dialog.Root open={open} onOpenChange={handleOpenChange}>
    <Dialog.Trigger disabled={disabled}>
      {#snippet child({ props })}
        <span class="svadmin-popconfirm__trigger" {...props} aria-disabled={disabled || undefined}>{@render children()}</span>
      {/snippet}
    </Dialog.Trigger>
    <Dialog.Content size="sm" closeOnOverlayClick={true} data-confirm-weight="irreversible">
      <Dialog.Header>
        <Dialog.Title>
          {#if typeof title === "string"}
            {title}
          {:else if title}
            {@render title()}
          {/if}
        </Dialog.Title>
      </Dialog.Header>
      <div class="svadmin-dialog-body">
        <div class="flex items-start gap-2">
          {#if icon}
            {@render icon()}
          {:else}
            <CircleAlert class="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          {/if}
          <div class="flex-1">
            <p class="leading-5">
              {#if typeof title === "string"}
                {title}
              {:else if title}
                {@render title()}
              {/if}
            </p>
            {#if content}
              <div class="mt-1 text-xs text-muted-foreground">
                {#if typeof content === "string"}
                  {content}
                {:else}
                  {@render content()}
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </div>
      <Dialog.Footer>
        <Button type="button" variant="outline" size="sm" disabled={okLoading} onclick={cancel}>{cancelText}</Button>
        <Button type="button" variant={okType === "danger" ? "destructive" : "default"} size="sm" loading={okLoading} disabled={okLoading} onclick={confirm}>{okText}</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{:else}
  <Popover.Root open={open} onOpenChange={handleOpenChange}>
    <Popover.Trigger disabled={disabled}>
      {#snippet child({ props })}
        <span class="svadmin-popconfirm__trigger" {...props} aria-disabled={disabled || undefined}>{@render children()}</span>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="svadmin-popconfirm" data-confirm-weight="light" sideOffset={8}>
      <div class="flex items-start gap-2">
        {#if icon}
          {@render icon()}
        {:else}
          <CircleAlert class="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        {/if}
        <div class="flex-1">
          <div class="svadmin-popconfirm__title leading-5">
            {#if typeof title === "string"}
              {title}
            {:else if title}
              {@render title()}
            {/if}
          </div>
          {#if content}
            <div class="svadmin-popconfirm__content mt-1 text-xs text-muted-foreground">
              {#if typeof content === "string"}
                {content}
              {:else}
                {@render content()}
              {/if}
            </div>
          {/if}
        </div>
      </div>
      <div class="svadmin-popconfirm__actions">
        <Button type="button" variant="outline" size="xs" disabled={okLoading} onclick={cancel}>{cancelText}</Button>
        <Button type="button" variant={okType === "danger" ? "destructive" : "default"} size="xs" loading={okLoading} disabled={okLoading} onclick={confirm}>{okText}</Button>
      </div>
    </Popover.Content>
  </Popover.Root>
{/if}
