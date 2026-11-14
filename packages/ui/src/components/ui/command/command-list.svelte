<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";

	let {
		ref = $bindable(null),
		class: className,
		"aria-label": ariaLabel = "Suggestions…",
		...restProps
	}: CommandPrimitive.ListProps = $props();
</script>

<CommandPrimitive.List
	bind:ref
	data-slot="command-list"
	data-cmdk-list=""
	class={cn("svadmin-command-list", className)}
	aria-label={ariaLabel}
	{...restProps}
/>
