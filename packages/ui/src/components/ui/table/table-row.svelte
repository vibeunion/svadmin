<script lang="ts">
	import type { WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLTableRowElement>> = $props();
</script>

<tr bind:this={ref} data-slot="table-row" class="svadmin-table-row {className ?? ''}" {...restProps}>
	{@render children?.()}
</tr>
