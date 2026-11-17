<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { getTabsContext } from "./tabs-context.svelte.js";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value: string;
		active?: boolean;
		destroyOnHide?: boolean;
	};

	let {
		ref = $bindable(null),
		value,
		active,
		destroyOnHide: destroyProp,
		class: className,
		children,
		...restProps
	}: Props = $props();

	const tabs = getTabsContext();
	const isActive = $derived(active ?? tabs.value === value);
	const shouldDestroy = $derived(destroyProp ?? tabs.destroyOnHide ?? true);
</script>

{#if shouldDestroy ? isActive : true}
	<div
		bind:this={ref}
		data-slot="tabs-content"
		role="tabpanel"
		hidden={!isActive ? true : undefined}
		style={!isActive ? "display: none;" : undefined}
		class={cn("svadmin-tabs-content", className)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
