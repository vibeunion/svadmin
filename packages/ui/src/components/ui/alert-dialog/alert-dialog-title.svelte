<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: AlertDialogPrimitive.TitleProps & { class?: string } = $props();
</script>

<AlertDialogPrimitive.Title
	bind:ref
	class={cn("svadmin-alert-dialog-title", className)}
	{...restProps}
/>
