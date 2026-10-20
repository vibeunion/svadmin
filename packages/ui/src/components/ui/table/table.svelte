<script lang="ts">
	import type { HTMLTableAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "../../../utils.js";

	type Props = WithElementRef<HTMLTableAttributes, HTMLTableElement>;

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: Props = $props();
</script>

<div data-slot="table-container" class="svadmin-table-container">
	<table bind:this={ref} data-slot="table" class={cn("svadmin-table", className)} {...restProps}>
		{@render children?.()}
	</table>
</div>
