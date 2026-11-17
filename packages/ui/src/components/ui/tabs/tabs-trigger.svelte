<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { getTabsContext, type TabsSize } from "./tabs-context.svelte.js";

	type Props = WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		value: string;
		active?: boolean;
		disabled?: boolean;
		size?: TabsSize;
	};

	let {
		ref = $bindable(null),
		value,
		active,
		disabled = false,
		size: sizeProp,
		onclick,
		onkeydown,
		tabindex,
		class: className,
		children,
		...restProps
	}: Props = $props();

	const tabs = getTabsContext();
	const isActive = $derived(active ?? tabs.value === value);
	const size = $derived(sizeProp ?? tabs.size ?? "default");
	type ButtonMouseEvent = MouseEvent & { currentTarget: EventTarget & HTMLButtonElement };
	type ButtonKeyboardEvent = KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement };

	function handleClick(event: ButtonMouseEvent) {
		if (disabled) return;
		onclick?.(event);
		if (!event.defaultPrevented) tabs.select(value);
	}

	function handleKeydown(event: ButtonKeyboardEvent) {
		if (disabled) return;
		onkeydown?.(event);
		if (event.defaultPrevented) return;

		const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
		if (!keys.includes(event.key)) return;

		const tabList = event.currentTarget.closest('[role="tablist"]');
		if (!tabList) return;
		const triggers: HTMLButtonElement[] = Array.from(
			tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')
		);
		const currentIndex = triggers.indexOf(event.currentTarget);
		if (currentIndex === -1 || triggers.length === 0) return;

		const nextIndex = event.key === "Home"
			? 0
			: event.key === "End"
				? triggers.length - 1
				: event.key === "ArrowRight" || event.key === "ArrowDown"
					? (currentIndex + 1) % triggers.length
					: (currentIndex - 1 + triggers.length) % triggers.length;

		event.preventDefault();
		triggers[nextIndex]?.focus();
		triggers[nextIndex]?.click();
	}
</script>

<button
	bind:this={ref}
	type="button"
	role="tab"
	data-slot="tabs-trigger"
	data-state={isActive ? "active" : "inactive"}
	data-size={size}
	data-disabled={disabled ? "" : undefined}
	disabled={disabled}
	aria-selected={isActive}
	tabindex={tabindex ?? (isActive ? 0 : -1)}
	class={cn("svadmin-tabs-trigger", className)}
	{...restProps}
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	{@render children?.()}
</button>
