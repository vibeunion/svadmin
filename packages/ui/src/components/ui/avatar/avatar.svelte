<script lang="ts" module>
	import { avatarVariants as resolveAvatarVariants, type AvatarSize as AvatarSizeValue } from "./avatar-variants.js";

	export { avatarVariants, type AvatarSize } from "./avatar-variants.js";
</script>

<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLImgAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLImgAttributes, HTMLImageElement> & {
		size?: AvatarSizeValue;
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
	<span data-size={size} class={cn(resolveAvatarVariants({ size }), className)}>
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
			resolveAvatarVariants({ size }),
			"svadmin-avatar-fallback",
			className
		)}
	>
		{fallback ?? alt?.charAt(0).toUpperCase() ?? "?"}
	</span>
{/if}
