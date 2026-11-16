<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "../../../utils.js";
	import { Skeleton } from "../skeleton/index.js";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		size?: "default" | "sm";
		hoverable?: boolean;
		bordered?: boolean;
		loading?: boolean;
	};

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = "default",
		hoverable = false,
		bordered = true,
		loading = false,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-size={size}
	data-hoverable={hoverable ? "true" : undefined}
	class={cn(
		"svadmin-card",
		hoverable && "svadmin-card--hoverable",
		!bordered && "border-0 shadow-none",
		className
	)}
	{...restProps}
>
	{#if loading}
		<div class="space-y-3 p-6" data-slot="card-loading">
			<Skeleton class="h-6 w-1/3" />
			<Skeleton class="h-4 w-full" />
			<Skeleton class="h-4 w-4/5" />
			<Skeleton class="h-16 w-full mt-2" />
		</div>
	{:else}
		{@render children?.()}
	{/if}
</div>
