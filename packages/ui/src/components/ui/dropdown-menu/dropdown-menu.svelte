<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	};

	let {
		ref = $bindable(null),
		open = $bindable(false),
		onOpenChange,
		class: className,
		children,
		...restProps
	}: Props = $props();

	import { setContext } from "svelte";

	function handleClickOutside(e: MouseEvent) {
		if (ref && !ref.contains(e.target as Node)) {
			open = false;
			onOpenChange?.(false);
		}
	}

	setContext("svadmin-dropdown-open", () => open);
	setContext("svadmin-dropdown-toggle", () => {
		open = !open;
		onOpenChange?.(open);
	});

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside, true);
			return () => document.removeEventListener('click', handleClickOutside, true);
		}
	});
</script>

<div
	bind:this={ref}
	data-slot="dropdown-menu"
	class={cn("svadmin-dropdown-menu", className)}
	{...restProps}
>
	{@render children?.()}
</div>
