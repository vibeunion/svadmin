<script lang="ts">
	import { Tooltip as TooltipPrimitive } from "bits-ui";
	import PopupPortal from "../popup-portal.svelte";

	let {
		anchor = null,
		...restProps
	}: TooltipPrimitive.PortalProps & { anchor?: HTMLElement | null } = $props();
</script>

<PopupPortal {...restProps} kind="tooltip" {anchor} />
