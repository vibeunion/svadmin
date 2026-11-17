<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		class?: string;
		loading?: boolean;
		animation?: boolean;
		/** Active animation alias for animation */
		active?: boolean;
		children?: Snippet;
	};

	let {
		ref = $bindable(null),
		class: className,
		loading = true,
		animation = true,
		active,
		children,
		...restProps
	}: Props = $props();

	const isAnimated = $derived(active !== undefined ? active : animation);
</script>

{#if !loading && children}
	{@render children()}
{:else}
	<div
		bind:this={ref}
		data-slot="skeleton"
		data-animation={isAnimated}
		class={cn("svadmin-skeleton", !isAnimated && "animate-none", className)}
		{...restProps}
	></div>
{/if}
