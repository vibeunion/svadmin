<script lang="ts">
  import type { Snippet } from "svelte";
  import { CircleAlert } from "@lucide/svelte";
  import Button from "./ui/button/button.svelte";
  import * as Popover from "./ui/popover/index.js";
  import * as Dialog from "./ui/dialog/index.js";

  let {
    title,
    okText = "确定",
    cancelText = "取消",
    okType = "primary",
    risk = "light",
    icon,
    onConfirm,
    children,
  }: {
    title: string;
    okText?: string;
    cancelText?: string;
    okType?: "primary" | "danger";
    /**
     * light：频繁的轻确认，仍用气泡，宽度不超过 320px。
     * irreversible：有风险或不可逆，改成对话框，不再弹出气泡。
     */
    risk?: "light" | "irreversible";
    icon?: Snippet;
    onConfirm?: () => void;
    children: Snippet;
  } = $props();

  let open = $state(false);

  function confirm() {
    onConfirm?.();
    open = false;
  }
</script>

{#if risk === "irreversible"}
  <Dialog.Root bind:open>
    <Dialog.Trigger>
      {#snippet child({ props })}
        <span class="svadmin-popconfirm__trigger" {...props}>{@render children()}</span>
      {/snippet}
    </Dialog.Trigger>
    <Dialog.Content size="sm" closeOnOverlayClick={true} data-confirm-weight="irreversible">
      <Dialog.Header>
        <Dialog.Title>{title}</Dialog.Title>
      </Dialog.Header>
      <div class="svadmin-dialog-body">
        <div class="flex items-start gap-2">
          {#if icon}
            {@render icon()}
          {:else}
            <CircleAlert class="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          {/if}
          <p class="leading-5">{title}</p>
        </div>
      </div>
      <Dialog.Footer>
        <Button type="button" variant="outline" size="sm" onclick={() => (open = false)}>{cancelText}</Button>
        <Button type="button" variant={okType === "danger" ? "destructive" : "default"} size="sm" onclick={confirm}>{okText}</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{:else}
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({ props })}
        <span class="svadmin-popconfirm__trigger" {...props}>{@render children()}</span>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="svadmin-popconfirm" data-confirm-weight="light" sideOffset={8}>
      <div class="flex items-start gap-2">
        {#if icon}
          {@render icon()}
        {:else}
          <CircleAlert class="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        {/if}
        <p class="svadmin-popconfirm__title leading-5">{title}</p>
      </div>
      <div class="svadmin-popconfirm__actions">
        <Button type="button" variant="outline" size="xs" onclick={() => (open = false)}>{cancelText}</Button>
        <Button type="button" variant={okType === "danger" ? "destructive" : "default"} size="xs" onclick={confirm}>{okText}</Button>
      </div>
    </Popover.Content>
  </Popover.Root>
{/if}
