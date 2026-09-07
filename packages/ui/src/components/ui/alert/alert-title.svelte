<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLAttributes<HTMLHeadingElement>>;

	let { ref = $bindable(null), class: className, children, ...restProps }: Props = $props();
</script>

<h5
	bind:this={ref}
	data-slot="alert-title"
	class={cn("svadmin-alert-title", className)}
	{...restProps}
>
	{@render children?.()}
</h5>
