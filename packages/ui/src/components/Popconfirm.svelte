<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from './ui/button/button.svelte';
  import * as Popover from './ui/popover/index.js';

  let {
    title,
    okText = '确定',
    cancelText = '取消',
    onConfirm,
    children,
  }: {
    title: string;
    okText?: string;
    cancelText?: string;
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
  <Popover.Content class="svadmin-popconfirm" sideOffset={8}>
    <p class="svadmin-popconfirm__title">{title}</p>
    <div class="svadmin-popconfirm__actions">
      <Button type="button" variant="outline" size="sm" onclick={() => (open = false)}>{cancelText}</Button>
      <Button type="button" size="sm" onclick={() => { onConfirm?.(); open = false; }}>{okText}</Button>
    </div>
  </Popover.Content>
</Popover.Root>
