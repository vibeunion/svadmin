<script lang="ts">
	import { getContext } from "svelte";
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLTdAttributes } from "svelte/elements";
	import type { TableDensity } from "./table.svelte";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLTdAttributes, HTMLTableCellElement> = $props();

	const getDensity = getContext<() => TableDensity>("svadmin-table-density");
	const densityClass = $derived(getDensity?.() === "compact"
		? "h-8 px-2 py-1 text-xs"
		: "p-2");
</script>

<td bind:this={ref} data-slot="table-cell" class={cn("align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", densityClass, className)} {...restProps}>
	{@render children?.()}
</td>
