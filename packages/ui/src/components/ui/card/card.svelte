<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "../../../utils.js";
	import { Skeleton } from "../skeleton/index.js";
	import CardHeader from "./card-header.svelte";
	import CardTitle from "./card-title.svelte";
	import CardAction from "./card-action.svelte";
	import CardContent from "./card-content.svelte";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		size?: "default" | "sm" | "small" | "mini";
		hoverable?: boolean;
		bordered?: boolean;
		loading?: boolean;
		title?: string | Snippet;
		extra?: Snippet;
	};

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = "default",
		hoverable = false,
		bordered = true,
		loading = false,
		title,
		extra,
		...restProps
	}: Props = $props();

	const normalizedSize = $derived(
		size === "small" || size === "mini" ? "sm" : size
	);
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-size={normalizedSize}
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
		{#if title || extra}
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				{#if title}
					<CardTitle>
						{#if typeof title === "string"}
							{title}
						{:else}
							<!-- string | Snippet 的联合在模板里无法自动收窄，这里显式断言。 -->
							{@render (title as Snippet)()}
						{/if}
					</CardTitle>
				{/if}
				{#if extra}
					<CardAction>
						{@render extra()}
					</CardAction>
				{/if}
			</CardHeader>
		{/if}
		{#if title || extra}
			<CardContent>
				{@render children?.()}
			</CardContent>
		{:else}
			{@render children?.()}
		{/if}
	{/if}
</div>
