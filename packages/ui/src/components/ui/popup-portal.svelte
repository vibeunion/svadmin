<script lang="ts">
  import { Portal, type PortalProps } from 'bits-ui';
  import { resolvePopupContainer, useComponentConfig } from '../ConfigProvider.svelte';

  let { to, children, ...restProps }: PortalProps = $props();

  const config = useComponentConfig();
  // 调用方传入的 to 优先；否则使用 ConfigProvider.getPopupContainer，默认 document.body。
  const target = $derived(to ?? resolvePopupContainer(config.getPopupContainer));
</script>

{#if target}
  <Portal to={target} {...restProps}>{@render children?.()}</Portal>
{:else}
  <Portal {...restProps}>{@render children?.()}</Portal>
{/if}
