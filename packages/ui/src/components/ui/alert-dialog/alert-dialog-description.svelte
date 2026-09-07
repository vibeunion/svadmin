<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: AlertDialogPrimitive.DescriptionProps & { class?: string } = $props();
</script>

<AlertDialogPrimitive.Description
	bind:ref
	class={cn("svadmin-alert-dialog-description", className)}
	{...restProps}
/>
