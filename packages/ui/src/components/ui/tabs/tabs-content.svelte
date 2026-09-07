<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { getTabsContext } from "./tabs-context.svelte.js";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value: string;
		active?: boolean;
	};

	let {
		ref = $bindable(null),
		value,
		active,
		class: className,
		children,
		...restProps
	}: Props = $props();

	const tabs = getTabsContext();
	const isActive = $derived(active ?? tabs.value === value);
</script>

{#if isActive}
	<div
		bind:this={ref}
		data-slot="tabs-content"
		role="tabpanel"
		class={cn("svadmin-tabs-content", className)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
