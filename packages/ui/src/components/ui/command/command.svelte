<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";

	let {
		ref = $bindable(null),
		value = $bindable(""),
		class: className,
		children,
		...restProps
	}: CommandPrimitive.RootProps = $props();
</script>

<CommandPrimitive.Root
	bind:ref
	bind:value
	data-slot="command"
	data-cmdk-root=""
	class={cn("svadmin-command", className)}
	{...restProps}
>
	{@render children?.()}
</CommandPrimitive.Root>
