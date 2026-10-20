<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLTdAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLTdAttributes, HTMLTableCellElement> & {
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

<td
	bind:this={ref}
	data-slot="table-cell"
	data-sticky={sticky ? (typeof sticky === "string" ? sticky : "right") : undefined}
	class={cn("svadmin-table-cell", className)}
	{...restProps}
>
	{@render children?.()}
</td>
