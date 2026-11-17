<script lang="ts" module>
	import { avatarVariants as resolveAvatarVariants, type AvatarSize as AvatarSizeValue, type AvatarShape as AvatarShapeValue } from "./avatar-variants.js";

	export { avatarVariants, type AvatarSize, type AvatarShape } from "./avatar-variants.js";
</script>

<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLImgAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLImgAttributes, HTMLImageElement> & {
		size?: AvatarSizeValue;
		shape?: AvatarShapeValue;
		fallback?: string;
		style?: string;
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

{#if src && !imgError}
	<span
		data-size={isNumericSize ? "custom" : size}
		data-shape={shape}
		class={cn(resolveAvatarVariants({ size, shape }), className)}
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
	</span>
{:else}
	<span
		data-slot="avatar-fallback"
		data-size={isNumericSize ? "custom" : size}
		data-shape={shape}
		class={cn(
			resolveAvatarVariants({ size, shape }),
			"svadmin-avatar-fallback",
			className
		)}
		style={mergedStyle}
	>
		{fallback ?? alt?.charAt(0).toUpperCase() ?? "?"}
	</span>
{/if}
