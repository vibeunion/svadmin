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
	class={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)}
	{...restProps}
>
	{@render children?.()}
	<NavigationMenuViewport />
</NavigationMenuPrimitive.Root>
