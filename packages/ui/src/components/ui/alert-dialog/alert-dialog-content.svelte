<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import type { WithoutChildrenOrChild } from "bits-ui";
	import { cn } from "../../../utils.js";
	import type { Snippet } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithoutChildrenOrChild<AlertDialogPrimitive.ContentProps> & { children?: Snippet; class?: string } = $props();
</script>

<AlertDialogPrimitive.Portal>
	<AlertDialogPrimitive.Overlay
		class="svadmin-alert-dialog-overlay"
	/>
	<AlertDialogPrimitive.Content
		bind:ref
		class={cn(
			"svadmin-alert-dialog-content",
			className,
		)}
		{...restProps}
	>
		{@render children?.()}
	</AlertDialogPrimitive.Content>
</AlertDialogPrimitive.Portal>
