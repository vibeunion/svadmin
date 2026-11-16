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
	};

	let {
		ref = $bindable(null),
		src,
		alt = "",
		size = "default",
		shape = "circle",
		fallback,
		class: className,
		...restProps
	}: Props = $props();

	let imgError = $state(false);
</script>

{#if src && !imgError}
	<span data-size={size} data-shape={shape} class={cn(resolveAvatarVariants({ size, shape }), className)}>
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
		data-size={size}
		data-shape={shape}
		class={cn(
			resolveAvatarVariants({ size, shape }),
			"svadmin-avatar-fallback",
			className
		)}
	>
		{fallback ?? alt?.charAt(0).toUpperCase() ?? "?"}
	</span>
{/if}
