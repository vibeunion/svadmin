<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import DialogPortal from "./dialog-portal.svelte";
	import type { Snippet } from "svelte";
	import * as Dialog from "./index.js";
	import { cn, type WithoutChildrenOrChild } from "../../../utils.js";
	import type { ComponentProps } from "svelte";
	import { Button } from "../../ui/button/index.js";
	import XIcon from '@lucide/svelte/icons/x';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		showCloseButton = true,
		closeOnOverlayClick = true,
		size,
		loading = false,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		children: Snippet;
		showCloseButton?: boolean;
		/** 信息展示可点遮罩关闭。录入表单应传 false。 */
		closeOnOverlayClick?: boolean;
		/** Arco 建议宽度：400 / 520 / 720。不传则保持现有默认宽度。 */
		size?: 'sm' | 'md' | 'lg';
		/** 加载中时正文区保持最小高度，避免标题和按钮跳动。 */
		loading?: boolean;
	} = $props();
</script>

<DialogPortal {...portalProps}>
	<Dialog.Overlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		data-dialog-size={size}
		data-close-on-overlay={closeOnOverlayClick ? 'true' : 'false'}
		data-loading={loading ? 'true' : undefined}
		aria-busy={loading ? 'true' : undefined}
		interactOutsideBehavior={closeOnOverlayClick ? 'close' : 'ignore'}
		class={cn(
			"svadmin-dialog-content",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close data-slot="dialog-close">
				{#snippet child({ props })}
					<Button variant="ghost" class="svadmin-dialog-dismiss absolute top-2 right-2" size="icon-sm" {...props}>
						<XIcon  />
						<span class="svadmin-sr-only">Close</span>
					</Button>
				{/snippet}
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPortal>
