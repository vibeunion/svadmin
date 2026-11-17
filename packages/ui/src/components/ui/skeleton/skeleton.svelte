<script lang="ts" module>
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	export type SkeletonTextProps = {
		rows?: number;
		width?: (number | string)[] | number | string;
	};

	export type SkeletonImageProps = {
		shape?: 'circle' | 'square';
		size?: 'small' | 'default' | 'large';
	};

	export type SkeletonProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		class?: string;
		loading?: boolean;
		animation?: boolean;
		/** Active animation alias for animation */
		active?: boolean;
		/** Render paragraph lines skeleton */
		text?: boolean | SkeletonTextProps;
		/** Render image or avatar skeleton block */
		image?: boolean | SkeletonImageProps;
		/** Render circular or pill rounded skeleton */
		round?: boolean;
		children?: Snippet;
	};
</script>

<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		loading = true,
		animation = true,
		active,
		text,
		image,
		round = false,
		children,
		...restProps
	}: SkeletonProps = $props();

	const isAnimated = $derived(active !== undefined ? active : animation);

	const textConfig = $derived.by(() => {
		if (!text) return null;
		if (typeof text === 'object') {
			return {
				rows: text.rows ?? 3,
				width: text.width,
			};
		}
		return { rows: 3, width: undefined };
	});

	const imageConfig = $derived.by(() => {
		if (!image) return null;
		if (typeof image === 'object') {
			return {
				shape: image.shape ?? 'square',
				size: image.size ?? 'default',
			};
		}
		return { shape: 'square', size: 'default' };
	});

	function getLineWidth(index: number, total: number, width?: (number | string)[] | number | string): string | undefined {
		if (width === undefined) {
			return index === total - 1 ? '60%' : '100%';
		}
		if (Array.isArray(width)) {
			const w = width[index];
			if (w === undefined) return index === total - 1 ? '60%' : '100%';
			return typeof w === 'number' ? `${w}px` : w;
		}
		if (index === total - 1) {
			return typeof width === 'number' ? `${width}px` : width;
		}
		return '100%';
	}

	const imageSizeClass = $derived.by(() => {
		if (!imageConfig) return '';
		switch (imageConfig.size) {
			case 'small':
				return 'h-8 w-8';
			case 'large':
				return 'h-16 w-16';
			case 'default':
			default:
				return 'h-12 w-12';
		}
	});
</script>

{#if !loading && children}
	{@render children()}
{:else if textConfig || imageConfig}
	<div
		bind:this={ref}
		data-slot="skeleton"
		data-animation={isAnimated}
		class={cn(
			"w-full",
			imageConfig && textConfig ? "flex items-start gap-4" : "space-y-3",
			className
		)}
		{...restProps}
	>
		{#if imageConfig}
			<div
				data-slot="skeleton-image"
				data-shape={imageConfig.shape}
				data-size={imageConfig.size}
				class={cn(
					"svadmin-skeleton shrink-0",
					imageSizeClass,
					imageConfig.shape === 'circle' ? "rounded-full" : round ? "rounded-lg" : "rounded-md",
					!isAnimated && "animate-none"
				)}
			></div>
		{/if}
		{#if textConfig}
			<div data-slot="skeleton-text" class="w-full space-y-2.5 flex-1">
				{#each Array.from({ length: textConfig.rows }, (_, i) => i) as idx (idx)}
					<div
						data-slot="skeleton-line"
						class={cn(
							"svadmin-skeleton h-4",
							round ? "rounded-full" : "rounded-sm",
							!isAnimated && "animate-none"
						)}
						style:width={getLineWidth(idx, textConfig.rows, textConfig.width)}
					></div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<div
		bind:this={ref}
		data-slot="skeleton"
		data-animation={isAnimated}
		class={cn("svadmin-skeleton", round ? "rounded-full" : "rounded-md", !isAnimated && "animate-none", className)}
		{...restProps}
	></div>
{/if}
