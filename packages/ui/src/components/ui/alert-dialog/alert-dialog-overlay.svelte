<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: AlertDialogPrimitive.OverlayProps & { class?: string } = $props();
</script>

<AlertDialogPrimitive.Overlay
	bind:ref
	class={cn("svadmin-alert-dialog-overlay", className)}
	{...restProps}
/>
