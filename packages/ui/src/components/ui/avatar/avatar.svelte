<script lang="ts" module>
	import { avatarVariants as variants, type AvatarSize as Size } from "./avatar-variants.js";

	export const avatarVariants = variants;
	export type AvatarSize = Size;
</script>

<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLImgAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLImgAttributes, HTMLImageElement> & {
		size?: AvatarSize;
		fallback?: string;
	};

	let {
		ref = $bindable(null),
		src,
		alt = "",
		size = "default",
		fallback,
		class: className,
		...restProps
	}: Props = $props();

	let imgError = $state(false);
</script>

{#if src && !imgError}
	<span data-size={size} class={cn(avatarVariants({ size }), className)}>
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
		class={cn(
			avatarVariants({ size }),
			"svadmin-avatar-fallback",
			className
		)}
	>
		{fallback ?? alt?.charAt(0).toUpperCase() ?? "?"}
	</span>
{/if}
