<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: "default" | "line" | "card";
		orientation?: "horizontal" | "vertical";
		scrollable?: boolean;
	};

	let {
		ref = $bindable(null),
		variant = "default",
		orientation = "horizontal",
		scrollable = false,
		class: className,
		children,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="tabs-list"
	class={cn(
		"svadmin-tabs-list",
		scrollable && "svadmin-tabs-list--scroll",
		className,
	)}
	role="tablist"
	aria-orientation={orientation}
	data-variant={variant}
	data-orientation={orientation}
	{...restProps}
>
	{@render children?.()}
</div>
