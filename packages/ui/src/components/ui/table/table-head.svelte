<script lang="ts">
	import { getContext } from "svelte";
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLThAttributes } from "svelte/elements";
	import type { TableDensity } from "./table.svelte";

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

	const getDensity = getContext<() => TableDensity>("svadmin-table-density");
</script>

<th bind:this={ref} data-slot="table-head" data-sticky={sticky ? (typeof sticky === "string" ? sticky : "right") : undefined} data-density={getDensity?.() === "compact" ? "compact" : "default"} class={cn("svadmin-table-head", className)} {...restProps}>
	{@render children?.()}
</th>
