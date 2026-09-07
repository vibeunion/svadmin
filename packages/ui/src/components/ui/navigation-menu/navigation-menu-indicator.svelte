<script lang="ts">
	import { NavigationMenu as NavigationMenuPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: NavigationMenuPrimitive.IndicatorProps = $props();
</script>

<NavigationMenuPrimitive.Indicator
	bind:ref
	data-slot="navigation-menu-indicator"
	class={cn("svadmin-navigation-indicator", className)}
	{...restProps}
>
	<div class="svadmin-navigation-indicator-arrow"></div>
</NavigationMenuPrimitive.Indicator>
