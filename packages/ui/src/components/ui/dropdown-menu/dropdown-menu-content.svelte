<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { getContext } from "svelte";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		align?: "start" | "center" | "end";
		/** 挂到 document.body，避免表格等 overflow 容器裁切菜单。 */
		portal?: boolean;
	};

	let {
		ref = $bindable(null),
		align = "end",
		portal = false,
		class: className,
		children,
		...restProps
	}: Props = $props();

	const getOpen = getContext<() => boolean>("svadmin-dropdown-open");
	const getRoot = getContext<(() => HTMLElement | null) | undefined>("svadmin-dropdown-root");
	const contentBridge = getContext<{ node: HTMLElement | null } | undefined>("svadmin-dropdown-content");
	let isOpen = $derived(getOpen?.() ?? true);

	function place(node: HTMLElement) {
		const trigger = getRoot?.()?.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]');
		if (!trigger) return;
		const rect = trigger.getBoundingClientRect();
		const gutter = 8;
		const width = node.offsetWidth;
		const height = node.offsetHeight;
		const maxLeft = Math.max(gutter, window.innerWidth - width - gutter);
		let left = align === "end"
			? rect.right - width
			: align === "center"
				? rect.left + (rect.width - width) / 2
				: rect.left;
		left = Math.min(Math.max(left, gutter), maxLeft);
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;
		const top = spaceBelow < height + gutter && spaceAbove > spaceBelow
			? Math.max(gutter, rect.top - height - 4)
			: Math.min(rect.bottom + 4, Math.max(gutter, window.innerHeight - height - gutter));
		node.style.position = "fixed";
		node.style.left = `${Math.round(left)}px`;
		node.style.top = `${Math.round(top)}px`;
		node.style.right = "auto";
		node.style.bottom = "auto";
		node.style.transform = "none";
		node.style.margin = "0";
		node.style.zIndex = "50";
		node.style.overflow = "visible";
	}

	function positionLayer(node: HTMLElement, enabled: boolean) {
		if (!enabled || typeof document === "undefined") return;
		document.body.appendChild(node);
		if (contentBridge) contentBridge.node = node;
		const update = () => place(node);
		update();
		const frame = requestAnimationFrame(update);
		const onMove = () => update();
		window.addEventListener("scroll", onMove, true);
		window.addEventListener("resize", onMove);
		return {
			destroy() {
				cancelAnimationFrame(frame);
				window.removeEventListener("scroll", onMove, true);
				window.removeEventListener("resize", onMove);
				if (contentBridge?.node === node) contentBridge.node = null;
				node.remove();
			},
		};
	}
</script>

{#if isOpen}
<div
	bind:this={ref}
	use:positionLayer={portal}
	data-slot="dropdown-menu-content"
	class={cn("svadmin-dropdown-content", `svadmin-dropdown-align-${align}`, className)}
	{...restProps}
>
	{@render children?.()}
</div>
{/if}
