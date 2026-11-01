<script lang="ts">
	import { Tooltip as TooltipPrimitive } from "bits-ui";
	import PopupPortal from "../popup-portal.svelte";

	let { ...restProps }: TooltipPrimitive.PortalProps = $props();
</script>

<PopupPortal {...restProps} />
