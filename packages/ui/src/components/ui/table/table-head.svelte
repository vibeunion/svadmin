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
	const densityClass = $derived(getDensity?.() === "compact"
		? "h-8 px-2 py-1 text-xs"
		: "h-9 px-2");
	const stickyClass = $derived(
		sticky === "right" || sticky === true
			? "sticky right-0 z-20 bg-background shadow-[-1px_0_0_var(--border)]"
			: sticky === "left"
			? "sticky left-0 z-20 bg-background shadow-[1px_0_0_var(--border)]"
			: ""
	);
</script>

<th bind:this={ref} data-slot="table-head" data-sticky={sticky ? (typeof sticky === "string" ? sticky : "right") : undefined} class={cn("text-foreground text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0", densityClass, stickyClass, className)} {...restProps}>
	{@render children?.()}
</th>
