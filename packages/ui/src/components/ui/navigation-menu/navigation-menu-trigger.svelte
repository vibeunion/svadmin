<script lang="ts">
	import { NavigationMenu as NavigationMenuPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: NavigationMenuPrimitive.TriggerProps = $props();
</script>

<NavigationMenuPrimitive.Trigger
	bind:ref
	data-slot="navigation-menu-trigger"
	class={cn("svadmin-navigation-trigger", className)}
	{...restProps}
>
	{@render children?.()}
	<ChevronDownIcon
		class="svadmin-navigation-trigger-icon"
		aria-hidden="true"
	/>
</NavigationMenuPrimitive.Trigger>
