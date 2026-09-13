<script lang="ts" module>
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { alertVariants as resolveAlertVariants, type AlertVariant as AlertVariantValue } from "./alert-variants.js";

	export { alertVariants, type AlertVariant } from "./alert-variants.js";
</script>

<script lang="ts">
	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariantValue;
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
	class={cn(resolveAlertVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
