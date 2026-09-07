<script lang="ts" module>
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { alertVariants as variants, type AlertVariant as Variant } from "./alert-variants.js";

	export const alertVariants = variants;
	export type AlertVariant = Variant;
</script>

<script lang="ts">
	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariant;
	};

	let {
		ref = $bindable(null),
		variant = "default",
		class: className,
		children,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="alert"
	role="alert"
	data-variant={variant}
	class={cn(alertVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
