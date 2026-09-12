<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { getContext } from "svelte";
	import { autoUpdate, computePosition, flip, offset, shift, size } from "@floating-ui/dom";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		align?: "start" | "center" | "end";
	};

	let {
		ref = $bindable(null),
		align = "end",
		class: className,
		children,
		...restProps
	}: Props = $props();

	const getOpen = getContext<() => boolean>("svadmin-dropdown-open");
	let isOpen = $derived(getOpen?.() ?? true);

	function floatingMenu(node: HTMLDivElement, alignment: "start" | "center" | "end") {
		const root = node.closest('[data-slot="dropdown-menu"]');
		const trigger = root?.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]');
		if (!trigger) return;
		let active = true;
		let generation = 0;
		let currentAlignment = alignment;
		node.dataset.floating = "";
		const anchor = trigger.getBoundingClientRect();
		node.style.left = `${anchor.left}px`;
		node.style.top = `${anchor.bottom + 4}px`;
		// Top-layer rendering avoids clipping without moving focus outside its drawer.
		if (typeof node.showPopover === "function") {
			node.setAttribute("popover", "manual");
			node.showPopover();
		}
		const updatePosition = () => {
			const request = ++generation;
			void computePosition(trigger, node, {
				strategy: "fixed",
				placement: currentAlignment === "center" ? "bottom" : `bottom-${currentAlignment}`,
				middleware: [
					offset(4),
					flip({ padding: 8 }),
					shift({ padding: 8 }),
					size({
						padding: 8,
						apply({ availableWidth, availableHeight }) {
							if (!active || request !== generation) return;
							node.style.maxWidth = `${Math.max(0, availableWidth)}px`;
							node.style.maxHeight = `${Math.max(0, availableHeight)}px`;
						},
					}),
				],
			}).then(({ x, y }) => {
				if (!active || request !== generation) return;
				node.style.left = `${x}px`;
				node.style.top = `${y}px`;
			});
		};
		const cleanup = autoUpdate(trigger, node, updatePosition, { animationFrame: true });
		return {
			update(nextAlignment: "start" | "center" | "end") {
				currentAlignment = nextAlignment;
				updatePosition();
			},
			destroy() {
				active = false;
				cleanup();
			},
		};
	}
</script>

{#if isOpen}
<div
	bind:this={ref}
	use:floatingMenu={align}
	data-slot="dropdown-menu-content"
	class={cn("svadmin-dropdown-content", `svadmin-dropdown-align-${align}`, className)}
	{...restProps}
>
	{@render children?.()}
</div>
{/if}

<style>
	[data-floating] {
		position: fixed;
		inset: auto;
		margin: 0;
		min-width: min(8rem, calc(100vw - 16px));
		overflow: auto;
		transform: none;
	}
</style>
