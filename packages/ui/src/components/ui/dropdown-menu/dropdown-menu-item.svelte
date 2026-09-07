<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		inset?: boolean;
		destructive?: boolean;
	};

	let {
		ref = $bindable(null),
		inset = false,
		destructive = false,
		class: className,
		children,
		...restProps
	}: Props = $props();
</script>

<button
	bind:this={ref}
	type="button"
	data-slot="dropdown-menu-item"
	data-variant={destructive ? "destructive" : "default"}
	data-inset={inset ? "true" : undefined}
	class={cn("svadmin-dropdown-item", className)}
	{...restProps}
>
	{@render children?.()}
</button>
