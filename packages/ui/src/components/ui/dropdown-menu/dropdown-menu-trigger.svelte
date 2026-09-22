<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { getContext } from "svelte";

	type Props = WithElementRef<HTMLButtonAttributes, HTMLButtonElement>;

	let {
		ref = $bindable(null),
		class: className,
		children,
		child,
		...restProps
	}: Props & { child?: import("svelte").Snippet<[{ props: Record<string, unknown> }]> } = $props();

	const toggle = getContext<() => void>("svadmin-dropdown-toggle");

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		toggle?.();
		restProps.onclick?.(e as Parameters<NonNullable<typeof restProps.onclick>>[0]);
	}
</script>

{#if child}
	{@render child({ props: { ...restProps, class: cn(className), "data-slot": "dropdown-menu-trigger", onclick: handleClick } })}
{:else}
	<button
		bind:this={ref}
		data-slot="dropdown-menu-trigger"
		class={cn(className)}
		{...restProps}
		onclick={handleClick}
	>
		{@render children?.()}
	</button>
{/if}
