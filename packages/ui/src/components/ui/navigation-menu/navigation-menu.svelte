<script lang="ts">
	import { NavigationMenu as NavigationMenuPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";
	import NavigationMenuViewport from "./navigation-menu-viewport.svelte";

	let {
		ref = $bindable(null),
		value = $bindable(""),
		class: className,
		children,
		...restProps
	}: NavigationMenuPrimitive.RootProps = $props();
</script>

<NavigationMenuPrimitive.Root
	bind:ref
	bind:value
	data-slot="navigation-menu"
	class={cn("svadmin-navigation-menu", className)}
	{...restProps}
>
	{@render children?.()}
	<NavigationMenuViewport />
</NavigationMenuPrimitive.Root>
