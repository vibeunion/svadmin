<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { getContext } from "svelte";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		align?: "start" | "center" | "end";
	};

	let {
		ref = $bindable(null),
		align = "end",
		class: className,
		children,
		...restProps
	}: Props = $props();

	const getOpen = getContext<() => boolean>("svadmin-dropdown-open");
	let isOpen = $derived(getOpen?.() ?? true);
</script>

{#if isOpen}
<div
	bind:this={ref}
	data-slot="dropdown-menu-content"
	class={cn("svadmin-dropdown-content", `svadmin-dropdown-align-${align}`, className)}
	{...restProps}
>
	{@render children?.()}
</div>
{/if}
