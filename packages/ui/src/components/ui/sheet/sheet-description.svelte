<script lang="ts">
	import { cn, type WithElementRef } from "../../../utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLAttributes<HTMLParagraphElement>>;

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: Props = $props();
</script>

<p
	bind:this={ref}
	data-slot="sheet-description"
	class={cn("svadmin-sheet-description", className)}
	{...restProps}
>
	{@render children?.()}
</p>
