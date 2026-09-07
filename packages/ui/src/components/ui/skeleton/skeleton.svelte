<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		class?: string;
	};

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="skeleton"
	class={cn("svadmin-skeleton", className)}
	{...restProps}
></div>
