<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import PopupPortal from "../popup-portal.svelte";

	let { ...restProps }: AlertDialogPrimitive.PortalProps = $props();
</script>

<PopupPortal {...restProps} />
