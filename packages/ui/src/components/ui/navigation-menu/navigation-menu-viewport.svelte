<script lang="ts">
	import { NavigationMenu as NavigationMenuPrimitive } from "bits-ui";
	import { cn } from "../../../utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: NavigationMenuPrimitive.ViewportProps = $props();
</script>

<div class="absolute top-full left-0 flex justify-center">
	<NavigationMenuPrimitive.Viewport
		bind:ref
		data-slot="navigation-menu-viewport"
		class={cn(
			"origin-top-center relative mt-1.5 h-[var(--bits-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-[0_18px_48px_rgba(15,23,42,0.14),0_4px_12px_rgba(15,23,42,0.08)] backdrop-blur-md transition-[width,height] duration-300 md:w-[var(--bits-navigation-menu-viewport-width)]",
			className
		)}
		{...restProps}
	/>
</div>
