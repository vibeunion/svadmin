<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import PopupPortal from "../popup-portal.svelte";

	let { ...restProps }: DialogPrimitive.PortalProps = $props();
</script>

<PopupPortal {...restProps} kind="dialog" />
