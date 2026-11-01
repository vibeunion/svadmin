<script lang="ts">
  import { Portal, type PortalProps } from 'bits-ui';
  import { resolvePopupContainer, useComponentConfig } from '../ConfigProvider.svelte';
  import { resolvePopupAnchor, type PopupAnchorKind } from './popup-anchor.js';

  let {
    to,
    anchor = null,
    kind,
    children,
    ...restProps
  }: PortalProps & {
    /** 调用方已知的触发器或定位锚点。优先传给 getPopupContainer。 */
    anchor?: HTMLElement | null;
    /** 用来把打开的触发器配到这一层浮层，避免串到别的弹层。 */
    kind?: PopupAnchorKind;
  } = $props();

  const config = useComponentConfig();
  // 留在源码树中的标记。触发器尚未绑定时，用它做 closest() 的回退节点。
  let marker = $state<HTMLElement | null>(null);
  const popupNode = $derived(resolvePopupAnchor(anchor, marker, kind));
  const portalReady = $derived(to !== undefined || popupNode !== undefined || typeof document === 'undefined');
  const target = $derived.by(() => {
    if (to !== undefined) return to;
    if (!portalReady) return undefined;
    return resolvePopupContainer(config.getPopupContainer, popupNode);
  });
</script>

<span bind:this={marker} class="svadmin-popup-anchor" data-svadmin-popup-anchor={kind ?? ''} aria-hidden="true"></span>
{#if portalReady}
  {#if target}
    <Portal to={target} {...restProps}>{@render children?.()}</Portal>
  {:else}
    <Portal {...restProps}>{@render children?.()}</Portal>
  {/if}
{/if}

<style>
  .svadmin-popup-anchor { display: contents; }
</style>
