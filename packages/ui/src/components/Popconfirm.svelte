<script lang="ts">
  import type { Snippet } from "svelte";
  import { CircleAlert } from "@lucide/svelte";
  import Button from "./ui/button/button.svelte";
  import * as Popover from "./ui/popover/index.js";

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
    /** 频繁的轻确认用 light。不可逆操作应改用 Dialog，这里只标记，不改成模态。 */
    risk?: "light" | "irreversible";
    icon?: Snippet;
    onConfirm?: () => void;
    children: Snippet;
  } = $props();

  let open = $state(false);
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <span class="svadmin-popconfirm__trigger" {...props}>{@render children()}</span>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="svadmin-popconfirm" data-confirm-weight={risk} sideOffset={8}>
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
      <Button type="button" variant={okType === "danger" ? "destructive" : "default"} size="xs" onclick={() => { onConfirm?.(); open = false; }}>{okText}</Button>
    </div>
  </Popover.Content>
</Popover.Root>
