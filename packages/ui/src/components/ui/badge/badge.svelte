<script lang="ts" module>
	import { badgeVariants as resolveBadgeVariants, type BadgeVariant as BadgeVariantValue } from "./badge-variants.js";

	export { badgeVariants, type BadgeVariant } from "./badge-variants.js";
</script>

<script lang="ts">
	import type { HTMLAnchorAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "../../../utils.js";

	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = "default",
		children,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> & {
		variant?: BadgeVariantValue;
	} = $props();
</script>

<svelte:element
	this={href ? "a" : "span"}
	bind:this={ref}
	data-slot="badge"
	data-variant={variant}
	{href}
	class={cn(resolveBadgeVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
