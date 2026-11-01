<script lang="ts">
	import { Popover as PopoverPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";
	import PopupPortal from "../popup-portal.svelte";

	let {
		ref = $bindable(null),
		class: className,
		align = "center",
		sideOffset = 4,
		...restProps
	}: PopoverPrimitive.ContentProps & { class?: string } = $props();

	const customAnchor = $derived(restProps.customAnchor);
	const anchor = $derived(typeof HTMLElement !== 'undefined' && customAnchor instanceof HTMLElement ? customAnchor : null);
</script>

<PopupPortal kind="popover" {anchor}>
	<PopoverPrimitive.Content
		bind:ref
		{align}
		{sideOffset}
		class={cn("svadmin-popover-content", className)}
		{...restProps}
	/>
</PopupPortal>
