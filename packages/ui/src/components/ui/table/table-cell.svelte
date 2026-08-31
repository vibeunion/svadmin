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
	const densityClass = $derived(getDensity?.() === "compact"
		? "h-8 px-2 py-1 text-xs"
		: "p-2");
	const stickyClass = $derived(
		sticky === "right" || sticky === true
			? "sticky right-0 z-10 bg-background shadow-[-1px_0_0_var(--border)] group-hover/row:bg-muted/50 group-data-[state=selected]/row:bg-muted"
			: sticky === "left"
			? "sticky left-0 z-10 bg-background shadow-[1px_0_0_var(--border)] group-hover/row:bg-muted/50 group-data-[state=selected]/row:bg-muted"
			: ""
	);
</script>

<td bind:this={ref} data-slot="table-cell" data-sticky={sticky ? (typeof sticky === "string" ? sticky : "right") : undefined} class={cn("align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", densityClass, stickyClass, className)} {...restProps}>
	{@render children?.()}
</td>
