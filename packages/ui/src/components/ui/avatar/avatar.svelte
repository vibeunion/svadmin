<script lang="ts" module>
	import { avatarVariants as resolveAvatarVariants, type AvatarSize as AvatarSizeValue, type AvatarShape as AvatarShapeValue } from "./avatar-variants.js";

	export { avatarVariants, type AvatarSize, type AvatarShape } from "./avatar-variants.js";
</script>

<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLImgAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	type Props = WithElementRef<HTMLImgAttributes, HTMLImageElement> & {
		size?: AvatarSizeValue;
		shape?: AvatarShapeValue;
		fallback?: string;
		style?: string;
		children?: Snippet;
		triggerType?: "mask" | "button";
		triggerIcon?: Snippet;
	};

	let {
		ref = $bindable(null),
		src,
		alt = "",
		size = "default",
		shape = "circle",
		fallback,
		class: className,
		style,
		children,
		triggerType = "mask",
		triggerIcon,
		...restProps
	}: Props = $props();

	let imgError = $state(false);

	const isNumericSize = $derived(typeof size === "number");
	const sizeStyle = $derived(
		isNumericSize
			? `width: ${size}px; height: ${size}px; font-size: ${Math.round((size as number) / 2)}px;`
			: undefined
	);
	const mergedStyle = $derived(
		[style, sizeStyle].filter(Boolean).join("; ") || undefined
	);
</script>

{#snippet triggerOverlay()}
	{#if triggerIcon}
		<span
			data-slot="avatar-trigger"
			data-trigger-type={triggerType}
			class={cn(
				"svadmin-avatar-trigger absolute inset-0 flex items-center justify-center transition-opacity",
				triggerType === "mask" ? "bg-black/40 text-white opacity-0 hover:opacity-100" : "bg-primary text-primary-foreground"
			)}
		>
			{@render triggerIcon()}
		</span>
	{/if}
{/snippet}

{#if src && !imgError}
	<span
		data-size={isNumericSize ? "custom" : size}
		data-shape={shape}
		class={cn("relative overflow-hidden inline-flex", resolveAvatarVariants({ size, shape }), className)}
		style={mergedStyle}
	>
		<img
			bind:this={ref}
			data-slot="avatar"
			{src}
			{alt}
			class="svadmin-avatar-image"
			onerror={() => { imgError = true; }}
			{...restProps}
		/>
		{@render triggerOverlay()}
	</span>
{:else}
	<span
		data-slot="avatar-fallback"
		data-size={isNumericSize ? "custom" : size}
		data-shape={shape}
		class={cn(
			"relative overflow-hidden inline-flex",
			resolveAvatarVariants({ size, shape }),
			"svadmin-avatar-fallback",
			className
		)}
		style={mergedStyle}
	>
		{#if children}
			{@render children()}
		{:else}
			{fallback ?? alt?.charAt(0).toUpperCase() ?? "?"}
		{/if}
		{@render triggerOverlay()}
	</span>
{/if}
