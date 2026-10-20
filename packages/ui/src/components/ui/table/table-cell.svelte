<script lang="ts">
	import { getContext } from "svelte";
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLTdAttributes } from "svelte/elements";
	import type { TableDensity } from "./table.svelte";

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

	const getDensity = getContext<() => TableDensity>("svadmin-table-density");
</script>

<td
	bind:this={ref}
	data-slot="table-cell"
	data-sticky={sticky ? (typeof sticky === "string" ? sticky : "right") : undefined}
	data-density={getDensity?.() === "compact" ? "compact" : "default"}
	class={cn("svadmin-table-cell", className)}
	{...restProps}
>
	{@render children?.()}
</td>
