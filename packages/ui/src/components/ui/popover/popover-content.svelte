<script lang="ts">
	import { Popover as PopoverPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";

	let {
		ref = $bindable(null),
		class: className,
		align = "center",
		sideOffset = 4,
		...restProps
	}: PopoverPrimitive.ContentProps & { class?: string } = $props();
</script>

<PopoverPrimitive.Portal>
	<PopoverPrimitive.Content
		bind:ref
		{align}
		{sideOffset}
		class={cn("svadmin-popover-content", className)}
		{...restProps}
	/>
</PopoverPrimitive.Portal>
