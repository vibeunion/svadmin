<script lang="ts">
	import { getContext } from "svelte";
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLThAttributes } from "svelte/elements";
	import type { TableDensity } from "./table.svelte";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLThAttributes, HTMLTableCellElement> = $props();

	const getDensity = getContext<() => TableDensity>("svadmin-table-density");
	const densityClass = $derived(getDensity?.() === "compact"
		? "h-8 px-2 py-1 text-xs"
		: "h-9 px-2");
</script>

<th bind:this={ref} data-slot="table-head" class={cn("text-foreground text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0", densityClass, className)} {...restProps}>
	{@render children?.()}
</th>
