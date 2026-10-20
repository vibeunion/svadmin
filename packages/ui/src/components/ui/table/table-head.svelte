<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLThAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLThAttributes, HTMLTableCellElement> & {
		sticky?: "left" | "right" | boolean;
	};

	let {
		ref = $bindable(null),
		sticky = false,
		class: className,
		children,
		...restProps
	}: Props = $props();
</script>

<th bind:this={ref} data-slot="table-head" data-sticky={sticky ? (typeof sticky === "string" ? sticky : "right") : undefined} class={cn("svadmin-table-head", className)} {...restProps}>
	{@render children?.()}
</th>
