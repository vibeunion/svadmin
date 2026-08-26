<script lang="ts">
	import { setContext } from "svelte";
	import type { HTMLTableAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "../../../utils.js";

	export type TableDensity = "compact" | "comfortable";

	type Props = WithElementRef<HTMLTableAttributes, HTMLTableElement> & {
		density?: TableDensity;
	};

	let {
		ref = $bindable(null),
		density = "comfortable",
		class: className,
		children,
		...restProps
	}: Props = $props();

	setContext("svadmin-table-density", () => density);
</script>

<div data-slot="table-container" data-table-density={density} class="relative w-full overflow-x-auto">
	<table bind:this={ref} data-slot="table" class={cn("w-full caption-bottom text-sm", className)} {...restProps}>
		{@render children?.()}
	</table>
</div>
